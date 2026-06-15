"""
Tests for BotpressScanner connector.
Target: 80%+ coverage of the connector layer.
"""

import pytest
import asyncio
from unittest.mock import AsyncMock, MagicMock, patch, call
import httpx

from app.connector.botpress import (
    BotpressScanner,
    BotpressError,
    BotpressTimeoutError,
    BotpressRateLimitError,
    BotpressNotFoundError,
    _redact_sensitive,
)
from app.tests.mock_botpress import (
    MockBotpressServer,
    make_mock_response,
    mock_404_response,
    mock_429_response,
    mock_500_response,
)


# ─────────────────────────────────────────────
# Secret Redaction
# ─────────────────────────────────────────────

class TestSecretRedaction:
    def test_redacts_authorization_header(self):
        text = "Error: authorization: Bearer"
        result = _redact_sensitive(text)
        assert "[REDACTED]" in result

    def test_redacts_api_key(self):
        text = "api_key=super-secret-value-here"
        result = _redact_sensitive(text)
        assert "[REDACTED]" in result
        assert "super-secret-value-here" not in result

    def test_redacts_password(self):
        text = "password=my-secret-pass"
        result = _redact_sensitive(text)
        assert "[REDACTED]" in result

    def test_redacts_token(self):
        text = "token=eyJhbGciOiJIUzI1NiJ9.secret"
        result = _redact_sensitive(text)
        assert "[REDACTED]" in result

    def test_safe_text_unchanged(self):
        text = "Normal error: connection refused at port 443"
        result = _redact_sensitive(text)
        assert result == text


# ─────────────────────────────────────────────
# validate_target
# ─────────────────────────────────────────────

class TestValidateTarget:
    @pytest.mark.asyncio
    async def test_validate_success(self):
        server = MockBotpressServer()
        scanner = BotpressScanner(
            webhook_id="test-webhook-id",
            timeout_seconds=5.0,
        )

        responses = [
            make_mock_response(201, server.make_user_response()),
            make_mock_response(201, server.make_conversation_response()),
        ]

        with patch.object(scanner, "_request_with_retry", new_callable=AsyncMock) as mock_req:
            mock_req.side_effect = responses
            result = await scanner.validate_target()

        assert result["success"] is True
        assert result["conversation_id"] == server.conversation_id
        assert result["user_key"] == "[REDACTED]"
        assert scanner._user_key == server.user_key
        assert scanner._conversation_id == server.conversation_id

    @pytest.mark.asyncio
    async def test_validate_404_webhook_not_found(self):
        scanner = BotpressScanner(
            webhook_id="nonexistent-webhook",
            timeout_seconds=5.0,
        )

        with patch.object(scanner, "_request_with_retry", new_callable=AsyncMock) as mock_req:
            mock_req.side_effect = BotpressNotFoundError("Webhook not found", status_code=404)
            with pytest.raises(BotpressNotFoundError):
                await scanner.validate_target()

    @pytest.mark.asyncio
    async def test_validate_user_connect_failure(self):
        scanner = BotpressScanner(webhook_id="test-webhook", timeout_seconds=5.0)

        with patch.object(scanner, "_request_with_retry", new_callable=AsyncMock) as mock_req:
            mock_req.return_value = make_mock_response(500, {"error": "Server error"})
            with pytest.raises(BotpressError):
                await scanner.validate_target()

    @pytest.mark.asyncio
    async def test_validate_missing_user_key(self):
        scanner = BotpressScanner(webhook_id="test-webhook", timeout_seconds=5.0)

        with patch.object(scanner, "_request_with_retry", new_callable=AsyncMock) as mock_req:
            mock_req.return_value = make_mock_response(200, {"no_key_here": "value"})
            with pytest.raises(BotpressError, match="No user key"):
                await scanner.validate_target()


# ─────────────────────────────────────────────
# execute_test
# ─────────────────────────────────────────────

class TestExecuteTest:
    @pytest.mark.asyncio
    async def test_execute_test_success(self):
        server = MockBotpressServer()
        scanner = BotpressScanner(
            webhook_id="test-webhook",
            timeout_seconds=5.0,
            poll_interval_seconds=0.1,
        )
        scanner._user_key = server.user_key
        scanner._conversation_id = server.conversation_id

        send_resp = make_mock_response(201, server.make_send_response())
        poll_resp = make_mock_response(200, server.make_messages_response(include_bot_reply=True))

        with patch.object(scanner, "_request_with_retry", new_callable=AsyncMock) as mock_req:
            mock_req.side_effect = [send_resp, poll_resp]
            result = await scanner.execute_test("Test prompt")

        assert result["response"] == server.bot_response
        assert result["latency_ms"] >= 0
        assert result["conversation_id"] == server.conversation_id

    @pytest.mark.asyncio
    async def test_execute_test_calls_validate_if_no_user_key(self):
        server = MockBotpressServer()
        scanner = BotpressScanner(
            webhook_id="test-webhook",
            timeout_seconds=5.0,
            poll_interval_seconds=0.1,
        )

        validate_responses = [
            make_mock_response(201, server.make_user_response()),
            make_mock_response(201, server.make_conversation_response()),
        ]
        send_resp = make_mock_response(201, server.make_send_response())
        poll_resp = make_mock_response(200, server.make_messages_response())

        with patch.object(scanner, "_request_with_retry", new_callable=AsyncMock) as mock_req:
            mock_req.side_effect = validate_responses + [send_resp, poll_resp]
            result = await scanner.execute_test("Hello bot")

        assert result["response"] == server.bot_response

    @pytest.mark.asyncio
    async def test_execute_test_send_failure(self):
        server = MockBotpressServer()
        scanner = BotpressScanner(
            webhook_id="test-webhook",
            timeout_seconds=5.0,
        )
        scanner._user_key = server.user_key
        scanner._conversation_id = server.conversation_id

        with patch.object(scanner, "_request_with_retry", new_callable=AsyncMock) as mock_req:
            mock_req.return_value = make_mock_response(503, {"error": "Service unavailable"})
            with pytest.raises(BotpressError):
                await scanner.execute_test("Test prompt")

    @pytest.mark.asyncio
    async def test_execute_test_timeout(self):
        server = MockBotpressServer()
        scanner = BotpressScanner(
            webhook_id="test-webhook",
            timeout_seconds=0.2,
            poll_interval_seconds=0.3,
        )
        scanner._user_key = server.user_key
        scanner._conversation_id = server.conversation_id

        send_resp = make_mock_response(201, server.make_send_response())
        empty_poll = make_mock_response(200, {"messages": []})

        with patch.object(scanner, "_request_with_retry", new_callable=AsyncMock) as mock_req:
            mock_req.side_effect = [send_resp] + [empty_poll] * 10
            with pytest.raises(BotpressTimeoutError):
                await scanner.execute_test("Test prompt")


# ─────────────────────────────────────────────
# reset_conversation
# ─────────────────────────────────────────────

class TestResetConversation:
    @pytest.mark.asyncio
    async def test_reset_conversation_success(self):
        server = MockBotpressServer()
        scanner = BotpressScanner(webhook_id="test-webhook", timeout_seconds=5.0)
        scanner._user_key = server.user_key
        scanner._conversation_id = "old-conv-id"

        new_conv_id = "new-conv-id-reset"
        new_conv_resp = make_mock_response(201, {"id": new_conv_id})

        with patch.object(scanner, "_request_with_retry", new_callable=AsyncMock) as mock_req:
            mock_req.return_value = new_conv_resp
            result = await scanner.reset_conversation()

        assert result["old_conversation_id"] == "old-conv-id"
        assert result["new_conversation_id"] == new_conv_id
        assert scanner._conversation_id == new_conv_id
        assert scanner._message_id is None

    @pytest.mark.asyncio
    async def test_reset_conversation_no_user_session(self):
        scanner = BotpressScanner(webhook_id="test-webhook", timeout_seconds=5.0)
        with pytest.raises(BotpressError, match="No active user session"):
            await scanner.reset_conversation()

    @pytest.mark.asyncio
    async def test_reset_conversation_server_error(self):
        scanner = BotpressScanner(webhook_id="test-webhook", timeout_seconds=5.0)
        scanner._user_key = "some-key"

        with patch.object(scanner, "_request_with_retry", new_callable=AsyncMock) as mock_req:
            mock_req.return_value = make_mock_response(500, {"error": "server error"})
            with pytest.raises(BotpressError):
                await scanner.reset_conversation()


# ─────────────────────────────────────────────
# get_platform_metadata
# ─────────────────────────────────────────────

class TestGetPlatformMetadata:
    @pytest.mark.asyncio
    async def test_metadata_success(self):
        scanner = BotpressScanner(webhook_id="my-webhook", timeout_seconds=5.0)

        with patch.object(scanner, "_request_with_retry", new_callable=AsyncMock) as mock_req:
            mock_req.return_value = make_mock_response(200, {"name": "MyBot", "version": "2.1"})
            result = await scanner.get_platform_metadata()

        assert result["platform"] == "Botpress"
        assert result["webhook_id"] == "my-webhook"
        assert result["status"] == "reachable"

    @pytest.mark.asyncio
    async def test_metadata_fallback_on_error(self):
        scanner = BotpressScanner(webhook_id="my-webhook", timeout_seconds=5.0)

        with patch.object(scanner, "_request_with_retry", new_callable=AsyncMock) as mock_req:
            mock_req.side_effect = BotpressError("unreachable")
            result = await scanner.get_platform_metadata()

        assert result["status"] == "unknown"
        assert result["webhook_id"] == "my-webhook"


# ─────────────────────────────────────────────
# Retry and error handling
# ─────────────────────────────────────────────

class TestRetryLogic:
    @pytest.mark.asyncio
    async def test_retries_on_500(self):
        scanner = BotpressScanner(
            webhook_id="test-webhook",
            timeout_seconds=5.0,
            max_retries=3,
            retry_delay_seconds=0.01,
        )

        server = MockBotpressServer()
        responses = [
            mock_500_response(),
            mock_500_response(),
            make_mock_response(201, server.make_user_response()),
        ]

        # Patch at the httpx client level
        mock_client = AsyncMock()
        mock_client.__aenter__ = AsyncMock(return_value=mock_client)
        mock_client.__aexit__ = AsyncMock(return_value=False)
        mock_client.request = AsyncMock(side_effect=responses)

        conv_resp = make_mock_response(201, server.make_conversation_response())
        mock_client.request.side_effect = responses + [conv_resp]

        with patch("httpx.AsyncClient", return_value=mock_client):
            result = await scanner.validate_target()

        assert result["success"] is True

    @pytest.mark.asyncio
    async def test_429_raises_rate_limit_error(self):
        scanner = BotpressScanner(
            webhook_id="test-webhook",
            timeout_seconds=5.0,
            max_retries=2,
            retry_delay_seconds=0.01,
        )

        mock_client = AsyncMock()
        mock_client.__aenter__ = AsyncMock(return_value=mock_client)
        mock_client.__aexit__ = AsyncMock(return_value=False)
        mock_client.request = AsyncMock(return_value=mock_429_response(retry_after=0.01))

        with patch("httpx.AsyncClient", return_value=mock_client):
            with pytest.raises(BotpressRateLimitError):
                await scanner.validate_target()

    @pytest.mark.asyncio
    async def test_404_raises_not_found(self):
        scanner = BotpressScanner(
            webhook_id="nonexistent",
            timeout_seconds=5.0,
            max_retries=1,
        )

        mock_client = AsyncMock()
        mock_client.__aenter__ = AsyncMock(return_value=mock_client)
        mock_client.__aexit__ = AsyncMock(return_value=False)
        mock_client.request = AsyncMock(return_value=mock_404_response())

        with patch("httpx.AsyncClient", return_value=mock_client):
            with pytest.raises(BotpressNotFoundError):
                await scanner.validate_target()

    @pytest.mark.asyncio
    async def test_network_error_retries_then_raises(self):
        scanner = BotpressScanner(
            webhook_id="test-webhook",
            timeout_seconds=5.0,
            max_retries=2,
            retry_delay_seconds=0.01,
        )

        mock_client = AsyncMock()
        mock_client.__aenter__ = AsyncMock(return_value=mock_client)
        mock_client.__aexit__ = AsyncMock(return_value=False)
        mock_client.request = AsyncMock(
            side_effect=httpx.ConnectError("Connection refused")
        )

        with patch("httpx.AsyncClient", return_value=mock_client):
            with pytest.raises(BotpressError):
                await scanner.validate_target()
