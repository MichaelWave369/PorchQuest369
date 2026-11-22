"""R3 optional AI tactical picker: finite-choice, bounded and origin-guarded."""
import json
import unittest
from unittest.mock import patch

from fastapi import HTTPException
from starlette.requests import Request

from porchquest.living_table import (
    TacticChoiceRequest, TacticOption, TacticMemory,
    choose_tactic
)


def req():
    return TacticChoiceRequest(
        companion_id='mira', actor_name='Mira',
        scene_title='Rain Trail', goal='Protect the party',
        memory_notes=[{'note':'A private injury.', 'visibility':'private'}],
        shared_notes=[TacticMemory(speaker='Kael',note='The river is flooded.')],
        last_event='Hero moves east.', opponents=[
            {'name':'Ash Wisp','hp':5,'x':2,'y':4}
        ],
        options=[
            TacticOption(id='move:2:3',label='Move north'),
            TacticOption(id='guard',label='Guard this position')
        ]
    )


def browser(origin='http://127.0.0.1:5173'):
    return Request({'type':'http','method':'POST','path':'/api/living-table/choose-tactic',
                    'headers':[(b'origin',origin.encode('ascii'))]})


class TacticalSelectorTests(unittest.TestCase):
    def test_model_chooses_only_existing_id_and_receives_scoped_context(self):
        def fake(messages):
            self.assertIn('private injury', messages[1]['content'])
            self.assertIn('river is flooded', messages[1]['content'])
            self.assertIn('allowed_actions', messages[1]['content'])
            return json.dumps({'option_id':'guard'})

        with patch('porchquest.living_table.adapter_status',return_value={'configured':True,'model':'test'}):
            with patch('porchquest.living_table._openai_compat_chat',side_effect=fake):
                result=choose_tactic(req(),browser())
        self.assertEqual(result['option_id'],'guard')
        self.assertTrue(result['non_canonical'])

    def test_hallucinated_or_invalid_reply_rejected(self):
        for output in [
            '{"option_id":"teleport:9:9"}',
            '{"option_id":"guard","success":true}',
            '{"option_id":"attack:foe-1"}',
            'I cast a spell!',
            '{"option_id":"guard"}' + 'x'*1000
        ]:
            with self.subTest(output=output[:30]):
                with patch('porchquest.living_table.adapter_status',return_value={'configured':True,'model':'test'}):
                    with patch('porchquest.living_table._openai_compat_chat',return_value=output):
                        with self.assertRaises(HTTPException) as error:
                            choose_tactic(req(),browser())
                self.assertEqual(error.exception.status_code,502)

    def test_origin_and_model_configuration_fail_closed(self):
        with patch('porchquest.living_table.adapter_status',return_value={'configured':True,'model':'test'}):
            with patch('porchquest.living_table._openai_compat_chat') as model:
                with self.assertRaises(HTTPException) as error:
                    choose_tactic(req(),browser('https://evil.example'))
                self.assertEqual(error.exception.status_code,403)
                model.assert_not_called()
        with patch('porchquest.living_table.adapter_status',return_value={'configured':False,'model':''}):
            with self.assertRaises(HTTPException) as error:
                choose_tactic(req(),browser())
            self.assertEqual(error.exception.status_code,409)

    def test_client_may_offer_only_known_action_shapes(self):
        bad=req()
        bad.options=[TacticOption(id='award:gold',label='Get treasure')]
        with patch('porchquest.living_table.adapter_status',return_value={'configured':True,'model':'test'}):
            with patch('porchquest.living_table._openai_compat_chat') as model:
                with self.assertRaises(HTTPException) as error:
                    choose_tactic(bad,browser())
                self.assertEqual(error.exception.status_code,400)
                model.assert_not_called()

    def test_companion_identity_and_duplicates_rejected(self):
        bad=req()
        bad.actor_name='Impostor'
        with patch('porchquest.living_table.adapter_status',return_value={'configured':True,'model':'test'}):
            with self.assertRaises(HTTPException) as error:
                choose_tactic(bad,browser())
            self.assertEqual(error.exception.status_code,400)
        duplicate=req()
        duplicate.options=[TacticOption(id='guard',label='Guard'),TacticOption(id='guard',label='Guard again')]
        with patch('porchquest.living_table.adapter_status',return_value={'configured':True,'model':'test'}):
            with self.assertRaises(HTTPException) as error:
                choose_tactic(duplicate,browser())
            self.assertEqual(error.exception.status_code,400)


if __name__ == '__main__':
    unittest.main()
