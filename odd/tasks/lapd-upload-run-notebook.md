# LAPD dashboard: CSV upload and notebook execution

## Objective

Add an end-to-end data-source flow to the Angular dashboard:

1. The user opens **Fuente de datos**.
2. The user selects or drops a LAPD CSV.
3. The browser uploads it to a backend job API.
4. The backend executes the full Unit 3 notebook with that CSV.
5. The dashboard polls job status and, when finished, receives normalized results.
6. The UI replaces its seed data with the new results without a page reload.

The implementation must also align the dashboard with the final Unit 3 direction:
profiles P01-P06, no K-Means, MLP/HGB/RF/persistence, and the new partitions.

## Problem

The current dashboard is a static Angular prototype:

- `DataSourceDialogComponent` only explains the methodology and shows a JSON schema.
- `CrimeAnalysisService` serves hardcoded K-Means data.
- `ModelViewComponent` still shows two K-Means profiles and old test totals.
- `ProfilesHeroComponent` hardcodes K-Means `k=2`.
- There is no backend capable of running the notebook.

## Scope

### In scope

- FastAPI job service under `server/`.
- Upload endpoint, job status endpoint, result endpoint, artifact download.
- Notebook execution in an isolated per-job directory.
- Normalization of notebook CSV outputs into the dashboard contract.
- Angular `DataJobService` with upload, polling, and result mapping.
- Upload/progress/error UI in the data-source dialog.
- Dashboard data model updated to P01-P06 and final metrics.
- Seed data regenerated from the final notebook outputs.
- README and backend run instructions.

### Out of scope

- Cloud deployment automation.
- Authentication/authorization.
- Persistent job database.
- Multi-user queues.
- Editing the notebook from the dashboard.

## Constraints

- Do not create backup files (`.bak`, `.backup*`, copies).
- Keep the Angular app buildable with `npm run build`.
- Keep backend dependencies explicit in `server/requirements.txt`.
- The notebook may take minutes; the API must be asynchronous.
- The uploaded CSV must never be trusted as a filename or path.
- Job directories must be unique and cleaned according to a retention policy.
- The backend must not execute arbitrary notebook paths from the request.

## Delivery strategy

- `ask-on-risk` with a single feature branch.
- Forecast: backend plus frontend changes exceed 400 authored lines.
- Keep commits as work units:
  1. backend job runner and API;
  2. Angular data contract and seed data;
  3. upload dialog and polling integration;
  4. docs and verification.

## Tasks

- [x] T1. Create `server/` FastAPI app with health, upload, status, result, and artifact endpoints.
- [x] T2. Implement isolated notebook execution with `CRIME_DATA` and `jupyter nbconvert`.
- [x] T3. Implement dashboard normalization from notebook CSV outputs and the uploaded CSV.
- [x] T4. Add `DataJobService` and API base configuration in Angular.
- [x] T5. Update domain models and `CrimeAnalysisService` to P01-P06 and final metrics.
- [x] T6. Regenerate `ZONES_DATA`, `PROFILES_DATA`, `MODELS_DATA`, `TYPIFICATIONS_DATA`, and `SCOPE_DATA` from notebook outputs.
- [x] T7. Update `DataSourceDialogComponent` with file input, drag/drop, progress, logs, and errors.
- [x] T8. Update `ProfilesHeroComponent`, `ModelViewComponent`, `DataViewComponent`, `ZoneViewComponent`, and `MapContainerComponent` for the new profile codes.
- [x] T9. Update `app.component.html` and `README.md` to remove K-Means references.
- [x] T10. Run `npm run build` and a backend import/health smoke test.

## Acceptance criteria

- The data-source dialog accepts a CSV and starts a job.
- The dialog shows queued/running/completed/failed states and a readable error.
- A completed job updates the dashboard data.
- The dashboard no longer mentions K-Means, Silhouette, ARI, or two profiles.
- The dashboard shows six profiles and the final model metrics.
- The map supports filtering by any P01-P06 profile.
- `npm run build` succeeds.
- The backend starts and `/api/health` responds.

## Verification

- `npm run build`
- `python3 -m compileall server`
- `uvicorn server.main:app --reload` and `curl http://localhost:8000/api/health`
- If a full notebook run is not feasible locally, verify the job API with a mocked runner and document the limitation.


## Progress

### 2026-11-13

- Backend created under `server/`: `main.py`, `runner.py`, `dashboard_builder.py`,
  `build_seed.py`, `requirements.txt`, `README.md`, and `__init__.py`.
- `python3 -m compileall server` passes.
- FastAPI health smoke test returns `200` with `status: ok`.
- Seed regenerated at `src/app/core/data/dashboard.seed.json` from the raw CSV and
  final notebook outputs, with the final partitions, scope, and per-profile incident
  count overrides.
- Angular models, service, dialog, profiles, model, data, zone, and map components
  migrated to P01-P06.
- `npm run build` passes: 445.86 kB main bundle, 128.44 kB initial transfer.

### Verification evidence

- `npm run build` -> success.
- `python3 -m compileall server` -> success.
- `TestClient(app).get('/api/health')` -> `200 {'status': 'ok', ...}`.
- Full notebook execution through the job API is not yet run end-to-end locally;
  it needs `LAPD_NOTEBOOK_PATH` and a real CSV. The runner is wired and the
  normalization path is validated by the seed generation.

### Remaining

- Run one real upload job with `LAPD_NOTEBOOK_PATH` pointing at the Unit 3
  notebook and a small `LAPD_CRIME_NROWS` sample to validate the full job
  lifecycle, then repeat with the full CSV.
- Decide the deployment retention policy for `server/jobs`.
- Add authentication/authorization before exposing the API publicly.
