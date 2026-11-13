"""Regenerate the Angular dashboard seed from the final notebook outputs.

Usage:
    python3 server/build_seed.py \
        --raw /path/to/Crime_Data_from_2020_to_Present.csv \
        --outputs /path/to/notebook/outputs \
        --out src/app/core/data/dashboard.seed.json
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from server.dashboard_builder import build_dashboard


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--raw", required=True, type=Path)
    parser.add_argument("--outputs", required=True, type=Path)
    parser.add_argument("--out", default=Path("src/app/core/data/dashboard.seed.json"), type=Path)
    parser.add_argument("--dataset-name", default=None)
    parser.add_argument("--panel-rows", type=int, default=None)
    parser.add_argument("--train-rows", type=int, default=None)
    parser.add_argument("--valid-rows", type=int, default=None)
    parser.add_argument("--usable-rows", type=int, default=None)
    parser.add_argument("--panel-zones", type=int, default=None)
    parser.add_argument(
        "--profile-incidents",
        default=None,
        help='JSON object with final per-profile incident counts, e.g. {"P01": 221643}',
    )
    args = parser.parse_args()

    payload = build_dashboard(
        args.raw,
        args.outputs,
        dataset_name=args.dataset_name or args.raw.name,
        panel_rows=args.panel_rows,
        train_rows=args.train_rows,
        valid_rows=args.valid_rows,
        usable_rows=args.usable_rows,
        panel_zones=args.panel_zones,
        profile_incidents=json.loads(args.profile_incidents) if args.profile_incidents else None,
    )
    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"wrote {args.out} ({args.out.stat().st_size} bytes)")


if __name__ == "__main__":
    main()
