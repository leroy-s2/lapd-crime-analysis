# LAPD dashboard backend

FastAPI service that runs the Unit 3 notebook for a CSV uploaded from the
Angular dashboard.

## Requirements

- Python 3.11+
- Jupyter and the notebook dependencies
- The Unit 3 notebook available on the server

Install dependencies:

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r server/requirements.txt
```

## Environment

```bash
export LAPD_NOTEBOOK_PATH="/absolute/path/to/Arquitectura_Redes_Neuronales_Perfilamiento_Delictivo.ipynb"
export LAPD_JOBS_DIR="/absolute/path/to/jobs"
export LAPD_CORS_ORIGINS="http://localhost:4200"
export LAPD_NOTEBOOK_TIMEOUT="7200"
```

`LAPD_NOTEBOOK_PATH` is mandatory. `LAPD_JOBS_DIR` defaults to `server/jobs`.
`LAPD_NOTEBOOK_TIMEOUT` is the per-cell timeout in seconds.

## Run

From the Angular project root:

```bash
uvicorn server.main:app --host 0.0.0.0 --port 8000 --reload
```

Health check:

```bash
curl http://localhost:8000/api/health
```

## Endpoints

- `POST /api/jobs` — multipart `file` field with a `.csv`.
- `GET /api/jobs/{id}` — status, progress, logs, and error.
- `GET /api/jobs/{id}/result` — normalized dashboard JSON.
- `GET /api/jobs/{id}/artifacts/{filename}` — allow-listed output artifact.

## Regenerate the seed

```bash
python3 server/build_seed.py \
  --raw /path/to/Crime_Data_from_2020_to_Present.csv \
  --outputs /path/to/notebook/outputs \
  --panel-rows 213624 --train-rows 150870 --valid-rows 31338 \
  --usable-rows 848979 --panel-zones 1102 \
  --profile-incidents '{"P01":221643,"P02":138433,"P03":67671,"P04":245419,"P05":22527,"P06":145729}'
```

## Job lifecycle

1. The CSV is stored as `jobs/<id>/input.csv`.
2. The notebook is copied to `jobs/<id>/notebook.ipynb`.
3. `jupyter nbconvert --execute` runs with `CRIME_DATA` pointing at the CSV.
4. The notebook exports its CSV artifacts in `jobs/<id>/`.
5. `dashboard_builder.py` normalizes those artifacts into `dashboard.json`.
6. The Angular dashboard polls the job and applies the payload.

The service keeps jobs in memory and on disk. It is intentionally single-node
and unauthenticated; put it behind the deployment platform's auth, queue, and
retention policy before exposing it publicly.
