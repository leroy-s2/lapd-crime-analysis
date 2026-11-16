import json
import os
import tempfile
import unittest
from pathlib import Path
from server.dashboard_store import load_latest_dashboard


def payload(job_id, date):
    return dict(zones=[], profiles=[], profileCatalog=[], models=[], typifications=[], scope=[], globalMix={}, premiseLabels={}, modelRun={'jobId':job_id,'generatedAt':date})


class LatestDashboardTests(unittest.TestCase):
    def test_empty_directory(self):
        with tempfile.TemporaryDirectory() as root:
            self.assertIsNone(load_latest_dashboard(Path(root)))

    def test_latest_generation_survives_registry_restart_and_ignores_mtime(self):
        with tempfile.TemporaryDirectory() as root:
            root=Path(root)
            for job, date in [('old','2026-11-13T23:41:00+00:00'),('new','2026-11-15T20:00:00Z')]:
                folder=root/job;folder.mkdir();(folder/'dashboard.json').write_text(json.dumps(payload(job,date)))
            os.utime(root/'old/dashboard.json',(2000000000,2000000000))
            self.assertEqual(load_latest_dashboard(root)['modelRun']['jobId'],'new')
            self.assertEqual(load_latest_dashboard(root)['modelRun']['generatedAt'],'2026-11-15T20:00:00Z')

    def test_incomplete_or_invalid_results_do_not_hide_previous_result(self):
        with tempfile.TemporaryDirectory() as root:
            root=Path(root)
            for name,text in [('ok',json.dumps(payload('ok','2026-11-15T20:00:00Z'))),('partial','{"modelRun":'),('invalid',json.dumps(payload('invalid','not-a-date'))),('seed',json.dumps(payload(None,'2026-11-16T20:00:00Z')))]:
                folder=root/name;folder.mkdir();(folder/'dashboard.json').write_text(text)
            self.assertEqual(load_latest_dashboard(root)['modelRun']['jobId'],'ok')


if __name__=='__main__':unittest.main()
