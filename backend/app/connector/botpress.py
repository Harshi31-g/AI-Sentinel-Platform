"""
Botpress Connector — isolated connector layer for AI Security Platform.

Implements the full Botpress integration flow:
1. Validate webhook
2. Connect user
3. Create conversation
4. Send message
5. Poll for response
6. Return structured result
"""

import asyncio
import re
import time
from typing import Optional
import httpx
import structlog

logger = structlog.get_logger(__name__)

SENSITIVE_PATTERNS = [
    r'x-secret-key\s*:\s*\S+',
    r'authorization\s*:\s*[\w\-\.]+',
    r'password\s*=\s*\S+',
    r'api[_-]?key\s*=\s*\S+',
    r'token\s*=\s*\S+',
]


def _redact_sensitive(text: str) -> str:
    """Remove secrets from error messages and responses."""
    result = text
    for pattern in SENSITIVE_PATTERNS:
        result = re.sub(pattern, '[REDACTED]', result, flags=re.IGNORECASE)
    return result


class BotpressError(Exception):
    """Base exception for Botpress connector errors."""
    def __init__(self, message: str, status_code: Optional[int] = None):
        super().__init__(_redact_sensitive(message))
        self.status_code = status_code


class BotpressTimeoutError(BotpressError):
    """Raised when the response polling times out."""
    pass


class BotpressRateLimitError(BotpressError):
    """Raised when rate limit is exceeded (429)."""
    pass


class BotpressNotFoundError(BotpressError):
    """Raised when the webhook target is not found (404)."""
    pass


class BotpressScanner:
    """
    Isolated connector for scanning Botpress AI agents.

    Handles the full conversation lifecycle:
    validate_target → execute_test → reset_conversation → get_platform_metadata
    """

    BOTPRESS_API_BASE = "https://chat.botpress.cloud"

    def __init__(
        self,
        webhook_id: str,
        encryption_key: Optional[str] = None,
        timeout_seconds: float = 30.0,
        poll_interval_seconds: float = 1.0,
        max_retries: int = 3,
        retry_delay_seconds: float = 1.0,
    ):
        self.webhook_id = webhook_id
        self.encryption_key = encryption_key
        self.timeout_seconds = timeout_seconds
        self.poll_interval_seconds = poll_interval_seconds
        self.max_retries = max_retries
        self.retry_delay_seconds = retry_delay_seconds

        self._user_key: Optional[str] = None
        self._conversation_id: Optional[str] = None
        self._message_id: Optional[str] = None

    def _get_base_url(self) -> str:
        return f"{self.BOTPRESS_API_BASE}/{self.webhook_id}"

    def _build_headers(self, user_key: Optional[str] = None) -> dict:
        headers = {
            "Content-Type": "application/json",
            "Accept": "application/json",
        }
        if user_key:
            headers["x-user-key"] = user_key
        return headers

    async def _request_with_retry(
        self,
        method: str,
        url: str,
        client: httpx.AsyncClient,
        **kwargs,
    ) -> httpx.Response:
        """Execute HTTP request with retry on transient failures."""
        last_exc: Optional[Exception] = None

        for attempt in range(self.max_retries):
            try:
                response = await client.request(method, url, **kwargs)

                if response.status_code == 429:
                    retry_after = float(response.headers.get("Retry-After", self.retry_delay_seconds * (attempt + 1)))
                    logger.warning("rate_limit_hit", attempt=attempt, retry_after=retry_after)
                    await asyncio.sleep(retry_after)
                    last_exc = BotpressRateLimitError(
                        f"Rate limit exceeded after {attempt + 1} attempts",
                        status_code=429,
                    )
                    continue

                if response.status_code == 404:
                    raise BotpressNotFoundError(
                        f"Webhook not found: {self.webhook_id}",
                        status_code=404,
                    )

                if response.status_code >= 500:
                    logger.warning("server_error", status=response.status_code, attempt=attempt)
                    if attempt < self.max_retries - 1:
                        await asyncio.sleep(self.retry_delay_seconds * (attempt + 1))
                        last_exc = BotpressError(
                            f"Server error {response.status_code}",
                            status_code=response.status_code,
                        )
                        continue

                return response

            except httpx.TimeoutException as exc:
                last_exc = BotpressTimeoutError(f"Request timed out: {exc}")
                logger.warning("request_timeout", attempt=attempt)
                if attempt < self.max_retries - 1:
                    await asyncio.sleep(self.retry_delay_seconds)
            except httpx.RequestError as exc:
                last_exc = BotpressError(f"Network error: {_redact_sensitive(str(exc))}")
                logger.warning("request_error", error=str(exc), attempt=attempt)
                if attempt < self.max_retries - 1:
                    await asyncio.sleep(self.retry_delay_seconds)

        if last_exc:
            raise last_exc
        raise BotpressError("Max retries exceeded")

    async def validate_target(self) -> dict:
        """
        Validate the Botpress webhook by connecting a user and checking connectivity.
        Returns metadata about the bot if successful.
        """
        async with httpx.AsyncClient(timeout=self.timeout_seconds) as client:
            # Step 1: Connect user to get user key
            logger.info("validate_target.connect_user", webhook_id=self.webhook_id)
            response = await self._request_with_retry(
                "POST",
                f"{self._get_base_url()}/users",
                client,
                headers=self._build_headers(),
                json={},
            )

            if response.status_code not in (200, 201):
                raise BotpressError(
                    f"Failed to connect user: HTTP {response.status_code}",
                    status_code=response.status_code,
                )

            data = response.json()
            user_key = data.get("key") or data.get("user", {}).get("key")
            if not user_key:
                raise BotpressError("No user key returned from Botpress")

            self._user_key = user_key

            # Step 2: Create a validation conversation
            logger.info("validate_target.create_conversation", webhook_id=self.webhook_id)
            conv_response = await self._request_with_retry(
                "POST",
                f"{self._get_base_url()}/conversations",
                client,
                headers=self._build_headers(user_key=user_key),
                json={},
            )

            if conv_response.status_code not in (200, 201):
                raise BotpressError(
                    f"Failed to create conversation: HTTP {conv_response.status_code}",
                    status_code=conv_response.status_code,
                )

            conv_data = conv_response.json()
            conversation_id = (
                conv_data.get("id")
                or conv_data.get("conversation", {}).get("id")
            )
            if not conversation_id:
                raise BotpressError("No conversation ID returned from Botpress")

            self._conversation_id = conversation_id

            logger.info(
                "validate_target.success",
                webhook_id=self.webhook_id,
                conversation_id=conversation_id,
            )

            return {
                "success": True,
                "webhook_id": self.webhook_id,
                "conversation_id": conversation_id,
                "user_key": "[REDACTED]",
            }

    async def execute_test(self, prompt: str, conversation_id: Optional[str] = None) -> dict:
        """
        Send a test message to the bot and poll for a response.
        Returns structured result with response text, latency, and timing.
        """
        if not self._user_key:
            await self.validate_target()

        conv_id = conversation_id or self._conversation_id
        if not conv_id:
            raise BotpressError("No conversation ID available. Call validate_target() first.")

        async with httpx.AsyncClient(timeout=self.timeout_seconds) as client:
            # Step 1: Send the message
            logger.info("execute_test.send_message", conversation_id=conv_id)
            start_time = time.monotonic()

            send_response = await self._request_with_retry(
                "POST",
                f"{self._get_base_url()}/conversations/{conv_id}/messages",
                client,
                headers=self._build_headers(user_key=self._user_key),
                json={
                    "payload": {
                        "type": "text",
                        "text": prompt,
                    }
                },
            )

            if send_response.status_code not in (200, 201):
                raise BotpressError(
                    f"Failed to send message: HTTP {send_response.status_code}",
                    status_code=send_response.status_code,
                )

            send_data = send_response.json()
            message_id = (
                send_data.get("id")
                or send_data.get("message", {}).get("id")
            )
            self._message_id = message_id

            # Step 2: Poll for bot response
            logger.info("execute_test.poll_response", conversation_id=conv_id)
            response_text = await self._poll_for_response(
                client=client,
                conversation_id=conv_id,
                after_message_id=message_id,
                start_time=start_time,
            )

            latency_ms = int((time.monotonic() - start_time) * 1000)

            logger.info(
                "execute_test.complete",
                conversation_id=conv_id,
                latency_ms=latency_ms,
            )

            return {
                "response": response_text,
                "latency_ms": latency_ms,
                "conversation_id": conv_id,
                "message_id": message_id,
            }

    async def _poll_for_response(
        self,
        client: httpx.AsyncClient,
        conversation_id: str,
        after_message_id: Optional[str],
        start_time: float,
    ) -> str:
        """Poll the conversation messages until a bot response is received."""
        deadline = start_time + self.timeout_seconds
        last_seen_id = after_message_id

        while time.monotonic() < deadline:
            await asyncio.sleep(self.poll_interval_seconds)

            response = await self._request_with_retry(
                "GET",
                f"{self._get_base_url()}/conversations/{conversation_id}/messages",
                client,
                headers=self._build_headers(user_key=self._user_key),
                params={"nextToken": None} if not last_seen_id else {},
            )

            if response.status_code != 200:
                logger.warning("poll_failed", status=response.status_code)
                continue

            data = response.json()
            messages = data.get("messages", [])

            # Find messages that came after our sent message
            bot_messages = [
                m for m in messages
                if m.get("direction") == "incoming"
                or m.get("authorId") != self._user_key
                or m.get("type") == "bot"
            ]

            # Filter to responses after what we sent
            if after_message_id and bot_messages:
                # Take the most recent bot message
                for msg in reversed(messages):
                    if msg.get("id") != after_message_id and msg.get("payload", {}).get("type") == "text":
                        text = msg.get("payload", {}).get("text", "")
                        if text:
                            return text

            # Fallback: look for any text message that isn't ours
            if messages:
                for msg in reversed(messages):
                    payload = msg.get("payload", {})
                    text = payload.get("text", "")
                    if text and msg.get("id") != after_message_id:
                        return text

        raise BotpressTimeoutError(
            f"No response received within {self.timeout_seconds}s timeout"
        )

    async def reset_conversation(self) -> dict:
        """
        Reset the current conversation state by creating a new conversation.
        Returns the new conversation ID.
        """
        if not self._user_key:
            raise BotpressError("No active user session. Call validate_target() first.")

        async with httpx.AsyncClient(timeout=self.timeout_seconds) as client:
            logger.info("reset_conversation", webhook_id=self.webhook_id)

            response = await self._request_with_retry(
                "POST",
                f"{self._get_base_url()}/conversations",
                client,
                headers=self._build_headers(user_key=self._user_key),
                json={},
            )

            if response.status_code not in (200, 201):
                raise BotpressError(
                    f"Failed to reset conversation: HTTP {response.status_code}",
                    status_code=response.status_code,
                )

            data = response.json()
            new_conversation_id = (
                data.get("id")
                or data.get("conversation", {}).get("id")
            )

            old_conversation_id = self._conversation_id
            self._conversation_id = new_conversation_id
            self._message_id = None

            logger.info(
                "reset_conversation.complete",
                old_conversation_id=old_conversation_id,
                new_conversation_id=new_conversation_id,
            )

            return {
                "old_conversation_id": old_conversation_id,
                "new_conversation_id": new_conversation_id,
            }

    async def get_platform_metadata(self) -> dict:
        """
        Retrieve metadata about the Botpress platform/bot.
        Returns bot configuration and platform information.
        """
        async with httpx.AsyncClient(timeout=self.timeout_seconds) as client:
            try:
                response = await self._request_with_retry(
                    "GET",
                    f"{self._get_base_url()}/",
                    client,
                    headers=self._build_headers(),
                )
                if response.status_code == 200:
                    data = response.json()
                    return {
                        "platform": "Botpress",
                        "webhook_id": self.webhook_id,
                        "status": "reachable",
                        "raw": data,
                    }
            except (BotpressError, Exception):
                pass

        return {
            "platform": "Botpress",
            "webhook_id": self.webhook_id,
            "status": "unknown",
        }
