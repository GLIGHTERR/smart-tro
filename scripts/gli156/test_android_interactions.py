import tempfile
import unittest
from pathlib import Path
from unittest.mock import call, patch

from scripts.gli156 import android_interactions as interaction


class NodeSelectionTests(unittest.TestCase):
    def test_prefers_clickable_accessible_control_to_text(self):
        xml = '<hierarchy><node text="Name"/><node content-desc="Name" clickable="true" bounds="[10,20][30,40]"/></hierarchy>'
        self.assertEqual(interaction.center(interaction.select_node(xml, "Name").get("bounds")), (20, 30))

    def test_text_fallback_and_disabled_state(self):
        node = interaction.select_node('<hierarchy><node text="Disabled" enabled="false"/></hierarchy>', "Disabled")
        self.assertEqual(node.get("enabled"), "false")

    def test_missing_and_malformed_xml(self):
        with self.assertRaises(LookupError):
            interaction.select_node('<hierarchy/>', 'Name')
        with self.assertRaises(Exception):
            interaction.select_node('<hierarchy>', 'Name')

    def test_bounds_normal_invalid_and_zero_area(self):
        self.assertEqual(interaction.center('[0,1][1,2]'), (0, 1))
        for bounds in (None, '', '[x,0][1,1]', '[0,0][0,1]', '[5,5][4,6]'):
            with self.subTest(bounds=bounds), self.assertRaises(ValueError):
                interaction.center(bounds)

    def test_case_records_success_and_exception(self):
        with tempfile.TemporaryDirectory() as directory, patch.object(interaction, 'OUT', Path(directory)), patch.object(interaction, 'RESULTS', []):
            interaction.run_case('ok', 'expected', lambda: 'actual')
            interaction.run_case('bad', 'expected', lambda: 1 / 0)
            self.assertEqual([r['status'] for r in interaction.RESULTS], ['observed', 'failure_or_incomplete'])
            self.assertIn('division by zero', (Path(directory) / 'results.json').read_text())

    def test_dialog_requires_alice_to_survive_control_and_android_back(self):
        dumps = [
            'Page 1',
            'Page 1 Alice',
            'Page 1 Alice Pilot dialog',
            'Page 1 Alice',
            'Page 1 Alice Pilot dialog',
            'Page 1 Alice',
        ]
        with patch.object(interaction, 'restart'), patch.object(interaction, 'tap') as tap, patch.object(interaction, 'shell') as shell, patch.object(interaction, 'dump', side_effect=dumps), patch.object(interaction.time, 'sleep') as sleep:
            result = interaction.dialog()
        self.assertIn('retaining Alice', result)
        shell.assert_has_calls([call('input', 'text', 'Alice'), call('input', 'keyevent', 'KEYCODE_BACK')])
        self.assertEqual(tap.call_args_list[0].args[1], 'Name')
        sleep.assert_called_with(1)

    def test_main_returns_failure_when_a_case_is_incomplete(self):
        with tempfile.TemporaryDirectory() as directory, patch.object(interaction, 'OUT', Path(directory)), patch.object(interaction, 'RESULTS', []), patch.object(interaction, 'shell', return_value=''), patch.object(interaction, 'adb') as adb, patch.object(interaction, 'run_case') as run_case:
            adb.return_value.stdout = b''
            def record_failure(*_):
                interaction.RESULTS.append({'status': 'failure_or_incomplete'})
            run_case.side_effect = record_failure
            self.assertEqual(interaction.main(), 1)
        adb.assert_called()


if __name__ == '__main__':
    unittest.main()
