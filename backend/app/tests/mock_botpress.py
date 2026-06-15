"""
Mock Botpress server for testing the connector.
Provides configurable responses for all test scenarios.
"""

from unittest.mock import AsyncMock, MagicMock, patch
import httpx


class MockBotpressServer:
    """Configurable mock for Botpress HTTP responses."""

    def __init__(self):
        self.user_key = "test-user-key-abc123"
        self.conversation_id = "conv-test-xyz789"
        self.message_id = "msg-test-001"
        self.bot_response = "Hello! I'm here to help. How can I assist you today?"
        self.fail_on_user_create = False
        self.fail_on_conversation = False
        self.fail_on_send = False
        self.fail_on_poll = False
        self.timeout_on_poll = False
        self.status_code_override: dict[str, int] = {}
        self.poll_call_count = 0

    def make_user_response(self) -> dict:
        return {"key": self.user_key, "user": {"id": "user-001", "key": self.user_key}}

    def make_conversation_response(self) -> dict:
        return {
            "id": self.conversation_id,
            "conversation": {"id": self.conversation_id},
        }

    def make_send_response(self) -> dict:
        return {
            "id": self.message_id,
            "message": {"id": self.message_id, "payload": {"type": "text", "text": "sent"}},
        }

    def make_messages_response(self, include_bot_reply: bool = True) -> dict:
        messages = [
            {
                "id": self.message_id,
                "payload": {"type": "text", "text": "user prompt"},
                "direction": "outgoing",
            }
        ]
        if include_bot_reply:
            messages.append(
                {
                    "id": "msg-bot-001",
                    "payload": {"type": "text", "text": self.bot_response},
                    "direction": "incoming",
                }
            )
        return {"messages": messages}


def make_mock_response(status_code: int, json_data: dict) -> MagicMock:
    resp = MagicMock(spec=httpx.Response)
    resp.status_code = status_code
    resp.json.return_value = json_data
    resp.headers = {}
    return resp


def mock_404_response() -> MagicMock:
    return make_mock_response(404, {"error": "Not found"})


def mock_429_response(retry_after: float = 1.0) -> MagicMock:
    resp = make_mock_response(429, {"error": "Rate limit exceeded"})
    resp.headers = {"Retry-After": str(retry_after)}
    return resp


def mock_500_response() -> MagicMock:
    return make_mock_response(500, {"error": "Internal server error"})
