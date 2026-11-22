"""Tests for runner failure handling that do not require Anki Desktop."""

import signal
import subprocess
import unittest
from unittest.mock import patch

from run import read_events, wait_for_process


class ProcessTests(unittest.TestCase):
    @patch("run.os.killpg")
    @patch("run.subprocess.Popen")
    def test_reaps_process_group_after_launcher_exits(self, popen, kill_group):
        launcher = popen.return_value.__enter__.return_value
        launcher.pid = 123
        launcher.wait.return_value = 0

        self.assertEqual(wait_for_process(["anki"], timeout=90), 0)

        kill_group.assert_called_once_with(123, signal.SIGKILL)

    @patch("run.os.killpg")
    @patch("run.subprocess.Popen")
    def test_reaps_process_group_on_timeout_or_interrupt(self, popen, kill_group):
        launcher = popen.return_value.__enter__.return_value
        launcher.pid = 123
        for error in (subprocess.TimeoutExpired("anki", 90), KeyboardInterrupt(), SystemExit(143)):
            with self.subTest(error=type(error)):
                kill_group.reset_mock()
                launcher.wait.side_effect = error
                with self.assertRaises(type(error)):
                    wait_for_process(["anki"], timeout=90)
                kill_group.assert_called_once_with(123, signal.SIGKILL)


class ReportTests(unittest.TestCase):
    def test_reports_invalid_json_at_its_line(self):
        with self.assertRaisesRegex(ValueError, "Invalid Anki report JSON on line 2"):
            read_events('{"step":"environment"}\n{"step":')

    def test_requires_a_step(self):
        with self.assertRaisesRegex(ValueError, "Missing Anki report step on line 1"):
            read_events('[]')


if __name__ == "__main__":
    unittest.main()
