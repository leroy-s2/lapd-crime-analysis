"""FastAPI entrypoint for LAPD dashboard notebook jobs."""

from __future__ import annotations

import json
import os
import shutil
from pathlib import Path

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse

from .runner import JOB_ROOT, NOTEBOOK_PATH, store

MAX_UPLOAD_BYTES = int(os.environ.get("LAPD_MAX_UPLOAD_BYTES", str(512 * 1024 * 1024)))
ALLOWED_ARTIFACTS = {
    "auditoria_tipificaciones.csv",
    "catalogo_perfiles.csv",
    "matriz_zona_perfil.csv",
    "perfil_zona_largo.csv",
    "perfil_zona_resumen.csv",
    "ranking_zona_perfil.csv",
    "resultados_modelos.csv",
    "predicciones_test.csv",
    "predicciones_zona_perfil.csv",
    "hotspots_perfil.csv",
    "mlp_perfilamiento.keras",
    "dashboard.json",
    "executed.ipynb",
}

app = FastAPI(title="LAPD Dashboard Jobs", version="1.0.0")

origins = [
    origin.strip()
    for origin in os.environ.get(
        "LAPD_CORS_ORIGINS",
        "http://localhost:4200,http://127.0.0.1:4200",
    ).split(",")
    if origin.strip()
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)


@app.get("/api/health")
def health() -> dict[str, object]:
    return {
        "status": "ok",
        "notebookConfigured": NOTEBOOK_PATH is not None,
        "notebookExists": bool(NOTEBOOK_PATH and NOTEBOOK_PATH.exists()),
        "jupyterAvailable": shutil.which("jupyter") is not None,
        "jobsRoot": str(JOB_ROOT),
    }


@app.post("/api/jobs", status_code=202)
async def create_job(file: UploadFile = File(...)) -> JSONResponse:
    filename = (file.filename or "dataset.csv").strip()
    safe_filename = Path(filename.replace("\\", "/")).name
    if not safe_filename or not safe_filename.lower().endswith(".csv"):
        raise HTTPException(status_code=400, detail="Solo se aceptan archivos .csv")

    job = store.create(filename=safe_filename, size=0)
    assert job.job_dir is not None
    input_path = job.job_dir / "input.csv"
    total = 0
    try:
        with input_path.open("wb") as target:
            while chunk := await file.read(1024 * 1024):
                total += len(chunk)
                if total > MAX_UPLOAD_BYTES:
                    raise HTTPException(
                        status_code=413,
                        detail=f"El CSV supera el límite de {MAX_UPLOAD_BYTES} bytes",
                    )
                target.write(chunk)
    except HTTPException:
        shutil.rmtree(job.job_dir, ignore_errors=True)
        raise
    except Exception as exc:  # noqa: BLE001 - upload boundary
        shutil.rmtree(job.job_dir, ignore_errors=True)
        raise HTTPException(status_code=500, detail=f"No se pudo guardar el CSV: {exc}") from exc

    store.update(job.id, size=total, message="CSV recibido; preparando ejecución")
    store.start(job.id)
    return JSONResponse(status_code=202, content=job.to_dict())


@app.get("/api/jobs/{job_id}")
def get_job(job_id: str) -> dict[str, object]:
    job = store.get(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job no encontrado")
    return job.to_dict()


@app.get("/api/jobs/{job_id}/result")
def get_result(job_id: str) -> JSONResponse:
    job = store.get(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job no encontrado")
    if job.status != "completed" or not job.result_path or not job.result_path.exists():
        raise HTTPException(status_code=409, detail="El resultado todavía no está disponible")
    return JSONResponse(content=json.loads(job.result_path.read_text(encoding="utf-8")))


@app.get("/api/jobs/{job_id}/artifacts/{filename}")
def get_artifact(job_id: str, filename: str) -> FileResponse:
    job = store.get(job_id)
    if not job or not job.job_dir:
        raise HTTPException(status_code=404, detail="Job no encontrado")
    safe_name = Path(filename).name
    if safe_name != filename or safe_name not in ALLOWED_ARTIFACTS:
        raise HTTPException(status_code=400, detail="Artefacto no permitido")
    path = job.job_dir / safe_name
    if not path.exists():
        raise HTTPException(status_code=404, detail="Artefacto no encontrado")
    return FileResponse(path, filename=safe_name)


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("server.main:app", host="0.0.0.0", port=int(os.environ.get("PORT", "8000")), reload=True)
