"""Asynchronous notebook job runner for the LAPD dashboard."""

from __future__ import annotations

import json
import os
import shutil
import subprocess
import sys
import threading
import traceback
import uuid
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from .dashboard_builder import build_dashboard

JOB_ROOT = Path(os.environ.get("LAPD_JOBS_DIR", Path(__file__).resolve().parent / "jobs"))
_NOTEBOOK_ENV = os.environ.get("LAPD_NOTEBOOK_PATH", "").strip()
BUNDLED_NOTEBOOK = (
    Path(__file__).resolve().parent / "notebooks"
    / "Arquitectura_Redes_Neuronales_Perfilamiento_Delictivo.ipynb"
)
NOTEBOOK_PATH = Path(_NOTEBOOK_ENV).expanduser().resolve() if _NOTEBOOK_ENV else BUNDLED_NOTEBOOK
DEFAULT_TIMEOUT = int(os.environ.get("LAPD_NOTEBOOK_TIMEOUT", "7200"))
LOG_LIMIT = 200


def _utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


@dataclass
class Job:
    id: str
    filename: str
    size: int
    status: str = "queued"
    progress: int = 0
    message: str = "En cola"
    logs: list[str] = field(default_factory=list)
    error: str | None = None
    created_at: str = field(default_factory=_utc_now)
    started_at: str | None = None
    finished_at: str | None = None
    job_dir: Path | None = None
    result_path: Path | None = None

    def to_dict(self) -> dict[str, Any]:
        return {
            "id": self.id,
            "filename": self.filename,
            "size": self.size,
            "status": self.status,
            "progress": self.progress,
            "message": self.message,
            "logs": self.logs[-40:],
            "error": self.error,
            "createdAt": self.created_at,
            "startedAt": self.started_at,
            "finishedAt": self.finished_at,
            "resultAvailable": self.result_path is not None and self.result_path.exists(),
        }


class JobStore:
    def __init__(self) -> None:
        self._jobs: dict[str, Job] = {}
        self._lock = threading.Lock()
        self._execution_slot = threading.Semaphore(1)
        JOB_ROOT.mkdir(parents=True, exist_ok=True)

    def create(self, filename: str, size: int) -> Job:
        job = Job(id=uuid.uuid4().hex, filename=filename, size=size)
        job.job_dir = JOB_ROOT / job.id
        job.job_dir.mkdir(parents=True, exist_ok=True)
        with self._lock:
            self._jobs[job.id] = job
        return job

    def get(self, job_id: str) -> Job | None:
        with self._lock:
            return self._jobs.get(job_id)

    def update(self, job_id: str, **changes: Any) -> None:
        with self._lock:
            job = self._jobs.get(job_id)
            if not job:
                return
            for key, value in changes.items():
                setattr(job, key, value)

    def append_log(self, job_id: str, line: str) -> None:
        with self._lock:
            job = self._jobs.get(job_id)
            if not job:
                return
            job.logs.append(line.rstrip())
            if len(job.logs) > LOG_LIMIT:
                job.logs = job.logs[-LOG_LIMIT:]

    def start(self, job_id: str) -> None:
        thread = threading.Thread(target=self._run, args=(job_id,), daemon=True)
        thread.start()

    def _run(self, job_id: str) -> None:
        # Keep waiting jobs queued; only one training process may use memory at a time.
        with self._execution_slot:
            self._run_serialized(job_id)

    def _run_serialized(self, job_id: str) -> None:
        job = self.get(job_id)
        if not job or not job.job_dir:
            return

        try:
            if NOTEBOOK_PATH is None or not NOTEBOOK_PATH.exists():
                raise FileNotFoundError(
                    f"Processing notebook not found: {NOTEBOOK_PATH}. Restore the bundled notebook or set LAPD_NOTEBOOK_PATH."
                )

            input_path = job.job_dir / "input.csv"
            if not input_path.exists():
                raise FileNotFoundError("Uploaded CSV was not found")

            notebook_copy = job.job_dir / "notebook.ipynb"
            shutil.copy2(NOTEBOOK_PATH, notebook_copy)

            self.update(
                job_id,
                status="running",
                progress=10,
                message="Notebook copiado; iniciando ejecución",
                started_at=_utc_now(),
            )
            self.append_log(job_id, f"Notebook: {NOTEBOOK_PATH}")
            self.append_log(job_id, f"Dataset: {input_path}")

            env = os.environ.copy()
            env["CRIME_DATA"] = str(input_path)
            env["MPLBACKEND"] = "Agg"
            env["TF_CPP_MIN_LOG_LEVEL"] = "2"
            env["PYTHONUNBUFFERED"] = "1"
            env["JUPYTER_PLATFORM_DIRS"] = "1"
            if os.environ.get("LAPD_CRIME_NROWS"):
                env["CRIME_NROWS"] = os.environ["LAPD_CRIME_NROWS"]

            command = [
                sys.executable,
                "-m",
                "jupyter",
                "nbconvert",
                "--to",
                "notebook",
                "--execute",
                f"--ExecutePreprocessor.timeout={DEFAULT_TIMEOUT}",
                "--ExecutePreprocessor.kernel_name=python3",
                "notebook.ipynb",
                "--output",
                "executed.ipynb",
            ]
            self.append_log(job_id, "Ejecutando: " + " ".join(command))

            process = subprocess.Popen(
                command,
                cwd=job.job_dir,
                env=env,
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                text=True,
                bufsize=1,
            )
            assert process.stdout is not None
            for line in process.stdout:
                self.append_log(job_id, line)
            return_code = process.wait()

            if return_code != 0:
                tail = "\n".join(self.get(job_id).logs[-20:]) if self.get(job_id) else ""
                raise RuntimeError(f"Notebook exited with code {return_code}\n{tail}")

            self.update(job_id, progress=85, message="Notebook completado; normalizando resultados")
            dashboard = build_dashboard(
                input_path,
                job.job_dir,
                job_id=job_id,
                dataset_name=job.filename,
            )
            result_path = job.job_dir / "dashboard.json"
            result_path.write_text(json.dumps(dashboard, ensure_ascii=False, indent=2), encoding="utf-8")
            self.update(
                job_id,
                status="completed",
                progress=100,
                message="Datos actualizados",
                result_path=result_path,
                finished_at=_utc_now(),
            )
            self.append_log(job_id, "Resultado listo: dashboard.json")
        except Exception as exc:  # noqa: BLE001 - job boundary
            self.append_log(job_id, traceback.format_exc())
            self.update(
                job_id,
                status="failed",
                progress=100,
                message="La ejecución falló",
                error=str(exc),
                finished_at=_utc_now(),
            )


store = JobStore()
