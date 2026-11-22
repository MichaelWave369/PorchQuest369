"""R2 model proposal validation and per-companion memory partition tests."""
import json
import unittest
from unittest.mock import patch

from fastapi import HTTPException
from starlette.requests import Request

from porchquest.living_table import MemoryNote, SayRequest, build_messages, propose


def browser_request(origin="http://127.0.0.1:5173"):
    return Request({"type": "http", "method": "POST", "path": "/api/living-table/propose",
                    "headers": [(b"origin", origin.encode("utf-8"))]})


def data(actor="mira"):
    return SayRequest(
        speaker="companion", companion_id=actor,
        campaign_title="Blackwood", scene_title="Old Porch",
        scene_description="It is raining.", hero_name="Seeker",
        companions=["Mira", "Kael"], facts=["The gate is iron."],
        clues=[], action="Suggest a useful action.",
        last_result="No roll yet.", recent_events=[],
        goal="Protect the route.",
        memory_notes=[MemoryNote(note="Personal hidden note", visibility="private"),
                      MemoryNote(note="The lantern flickered.", visibility="party")],
    )


class CompanionProposalsTests(unittest.TestCase):
    def test_dm_does_not_receive_targeted_character_memories(self):
        req = data()
        req.speaker = "dm"
        text = build_messages(req)[1]["content"]
        self.assertNotIn("Personal hidden note", text)
        self.assertNotIn("character_goal", text)

    def test_selected_companion_memory_only(self):
        text = build_messages(data())[1]["content"]
        self.assertIn("Personal hidden note", text)
        self.assertIn("Protect the route.", text)

    def test_server_returns_only_strict_legal_proposals(self):
        with patch("porchquest.living_table.adapter_status", return_value={"configured": True, "model": "qwen3:4b"}):
            with patch("porchquest.living_table._openai_compat_chat", return_value=
                       json.dumps({"action": "investigate", "skill": "survival",
                                   "intent": "I will inspect the tracks."})):
                response = propose(data(), browser_request())
        self.assertTrue(response["non_canonical"])
        self.assertEqual(response["proposal"]["skill"], "survival")
        self.assertEqual(set(response["proposal"]), {"action", "skill", "intent"})

    def test_arbitrary_or_model_hallucinated_actions_are_rejected(self):
        bad = [
            '{"action":"travel","skill":"survival","intent":"Teleport to the end"}',
            '{"action":"investigate","skill":"arcana","intent":"I want to win now"}',
            '{"action":"investigate","skill":"survival","intent":"I look","gold":9999}',
            'The die says I win.',
            '{"action":"investigate","skill":"survival","intent":"x"}',
        ]
        for reply in bad:
            with self.subTest(reply=reply):
                with patch("porchquest.living_table.adapter_status", return_value={"configured": True, "model": "test"}):
                    with patch("porchquest.living_table._openai_compat_chat", return_value=reply):
                        with self.assertRaises(HTTPException) as err:
                            propose(data(), browser_request())
                self.assertEqual(err.exception.status_code, 502)

    def test_untrusted_origin_refused_before_inference(self):
        with patch("porchquest.living_table.adapter_status", return_value={"configured": True, "model": "test"}):
            with patch("porchquest.living_table._openai_compat_chat") as model:
                with self.assertRaises(HTTPException) as err:
                    propose(data(), browser_request("https://not-allowed.example"))
                self.assertEqual(err.exception.status_code, 403)
                model.assert_not_called()

    def test_nonparty_companion_refused_before_inference(self):
        req = data("bram")
        with patch("porchquest.living_table.adapter_status", return_value={"configured": True, "model": "test"}):
            with patch("porchquest.living_table._openai_compat_chat") as model:
                with self.assertRaises(HTTPException) as err:
                    propose(req, browser_request())
                self.assertEqual(err.exception.status_code, 400)
                model.assert_not_called()


if __name__ == "__main__":
    unittest.main()
