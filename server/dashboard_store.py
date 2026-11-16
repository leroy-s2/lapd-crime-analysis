"""Recover the most recent generated dashboard without the in-memory job registry."""
from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


def load_latest_dashboard(root: Path) -> dict[str, Any] | None:
    latest: dict[str, Any] | None = None
    latest_time: datetime | None = None
    required = {
        "zones", "profiles", "profileCatalog", "models", "typifications",
        "scope", "globalMix", "premiseLabels", "modelRun",
    }
    for path in root.glob("*/dashboard.json"):
        try:
            payload = json.loads(path.read_text(encoding="utf-8"))
            if not isinstance(payload, dict) or not required.issubset(payload):
                continue
            run = payload["modelRun"]
            if not isinstance(run, dict) or not run.get("jobId"):
                continue
            generated = datetime.fromisoformat(run["generatedAt"].replace("Z", "+00:00"))
            if generated.tzinfo is None:
                generated = generated.replace(tzinfo=timezone.utc)
            if latest_time is None or generated > latest_time:
                latest, latest_time = payload, generated
        except (OSError, ValueError, TypeError, KeyError, AttributeError):
            # A failed or still-written result must not hide an earlier usable dashboard.
            continue
    return latest
