"""Living Table API contract and authority boundary tests."""
import unittest
from unittest.mock import patch

from fastapi import HTTPException
from starlette.requests import Request

from porchquest.living_table import SayRequest, build_messages, say, status


def request_with_origin(origin: str) -> Request:
    return Request({"type": "http", "method": "POST", "path": "/api/living-table/say",
                    "headers": [(b"origin", origin.encode("ascii"))]})


def payload(speaker="dm", companion_id=None, companions=None):
    return SayRequest(speaker=speaker, companion_id=companion_id,
                      campaign_title="The Lantern Hill", scene_title="Gate",
                      scene_description="Old iron gate in the woods.",
                      hero_name="Lantern Seeker", companions=companions or [],
                      action="I examine the gate.",
                      last_result="perception: 6 + 3 = 9 vs DC 14 (failure)",
                      recent_events=["No clue found."], facts=["The moon is rising."])


class LivingTableApiTests(unittest.TestCase):
    def test_model_prompt_keeps_canon_authoritative(self):
        messages = build_messages(payload())
        self.assertEqual([x["role"] for x in messages], ["system", "user"])
        self.assertIn("deterministic game engine", messages[0]["content"])
        self.assertIn("failure", messages[1]["content"])
        self.assertIn("player_approved_world_facts", messages[1]["content"])

    def test_companion_requires_known_identity_and_current_party(self):
        with self.assertRaises(ValueError):
            build_messages(payload("companion", "unknown", ["Unknown"]))
        with self.assertRaises(ValueError):
            build_messages(payload("companion", "mira", ["Kael"]))
        self.assertIn("Mira", build_messages(payload("companion", "mira", ["Mira"]))[0]["content"])

    def test_unapproved_origin_is_rejected_before_model_call(self):
        with patch("porchquest.living_table.adapter_status", return_value={"configured": True, "model": "local"}):
            with patch("porchquest.living_table._openai_compat_chat") as model:
                with self.assertRaises(HTTPException) as error:
                    say(payload(), request_with_origin("https://malicious.example"))
                self.assertEqual(error.exception.status_code, 403)
                model.assert_not_called()

    def test_missing_model_is_explicitly_unavailable(self):
        with patch("porchquest.living_table.adapter_status", return_value={"configured": False, "model": ""}):
            self.assertFalse(status()["configured"])
            with self.assertRaises(HTTPException) as error:
                say(payload(), request_with_origin("http://127.0.0.1:5173"))
            self.assertEqual(error.exception.status_code, 409)

    def test_ai_reply_is_non_canonical(self):
        with patch("porchquest.living_table.adapter_status", return_value={"configured": True, "model": "qwen3:4b"}):
            with patch("porchquest.living_table._openai_compat_chat", return_value="The gate holds fast.") as model:
                response = say(payload(), request_with_origin("http://127.0.0.1:5173"))
        self.assertEqual(response["text"], "The gate holds fast.")
        self.assertTrue(response["non_canonical"])
        self.assertEqual(response["model"], "qwen3:4b")
        model.assert_called_once()


if __name__ == "__main__":
    unittest.main()
