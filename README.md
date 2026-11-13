# LAPD Territorial Profiling & Crime Analysis Dashboard

An Angular 19 GIS application modeling crime forecasting and territorial profiling across the **21 Police Divisions of Los Angeles, California**.

Built with **Clean Architecture**, **Angular Signals**, and **Leaflet GIS** using official GeoJSON boundaries from the City of Los Angeles GeoHub.

---

## Key Features

1. **Real Geographic Modeling**:
   - Interactive spatial visualization with actual LAPD Division boundaries (`EPSG:4326`).
   - Multiple basemap styles: **CartoDB Positron** (light civic style), **CartoDB Dark Matter**, and **OpenStreetMap**.
   - Two thematic color scales:
     - **Forecast Crime Volume (Choropleth)**: 5-tier intensity gradient based on neural network / ML crime predictions.
     - **Territorial Profile (P01–P06)**: Color-codes the six typology-based crime profiles across divisions.
   - Dynamic layer toggles for district polygon blocks, centroid labels, and pin markers.
   - Spatial quick navigation: "Ver todo Los Ángeles" (fit bounds) and "Enfocar selección" (smooth fly-to).

2. **21 LAPD Divisions & 4 Bureaus**:
   - **Central Bureau**: Central (D-01), Rampart (D-02), Hollenbeck (D-04), Newton (D-17), Northeast (D-19).
   - **South Bureau**: Southwest (D-03), Harbor (D-05), 77th Street (D-20), Southeast (D-21).
   - **West Bureau**: Hollywood (D-06), Wilshire (D-07), West LA (D-08), Olympic (D-16), Pacific (D-18).
   - **Valley Bureau**: Van Nuys (D-09), North Hollywood (D-10), Foothill (D-11), Devonshire (D-12), Topanga (D-13), West Valley (D-14), Mission (D-15).
   - Interactive Bureau filtering chips to isolate and compare specific zones.

3. **Machine Learning & Statistical Insights**:
   - Historical window: **2020-01 to 2023-11** (848,979 usable crime incidents, 1,102 panel zones, 1,000 zones with an assigned profile).
   - Evaluated models: **Multilayer Perceptron (MLP)**, **HistGradientBoosting (HGB)**, **Random Forest (RF)**, and **Persistence Baseline**.
   - Profiles **P01–P06** built from explicit typology rules, without K-Means clustering.
   - Multi-criteria priority score: participation, lift, trend, severity, and evidence volume.
   - 12-month historical crime trends rendered with lightweight SVG sparklines.
   - Crime category breakdowns with citywide sector benchmarks.
   - Incident premises distribution.

---

## Architecture Overview

```
src/app/
├── core/
│   ├── data/
│   │   └── crime-analysis.data.ts      # Domain datasets, ML metrics, scope statistics
│   ├── models/
│   │   └── crime-analysis.models.ts    # TypeScript domain interfaces and types
│   └── services/
│       ├── crime-analysis.service.ts   # Central reactive state store (Angular Signals)
│       ├── data-job.service.ts         # Upload, poll, and fetch notebook job results
│       └── geo-data.service.ts         # GeoJSON boundary provider with RxJS caching
├── features/
│   ├── dashboard/
│   │   ├── zone-view/                  # Division details, sparkline, category mix, ranking
│   │   ├── model-view/                 # Model comparison, partitions, MLP architecture, profiles
│   │   └── data-view/                  # Dataset scope, typifications, artifacts, methodological limits
│   └── map/
│       └── map-container/              # Leaflet GIS canvas, GeoJSON polygons, layer rail
└── shared/
    └── components/
        ├── bar-chart/                  # Horizontal benchmarked distribution bars
        ├── data-source-dialog/         # CSV upload, notebook job status, canonical schema modal
        ├── header/                     # Civic header with live search & keyboard shortcuts
        └── sparkline/                  # Accessible vector sparkline

server/
├── main.py              # FastAPI upload, job, result, and artifact endpoints
├── runner.py            # Asynchronous jupyter nbconvert job runner
├── dashboard_builder.py # Normalizes notebook outputs into the dashboard contract
└── build_seed.py        # Regenerates src/app/core/data/dashboard.seed.json
```

---

## Development & Build Commands

### Install dependencies
```bash
npm install
```

### Run local dev server
```bash
npm start
```
Navigate to `http://localhost:4200/`.

### Run unit tests
```bash
npm test -- --watch=false
```

### Production build
```bash
npm run build
```
Generates optimized static artifacts in `dist/lapd-crime-analysis/`.
Transfer size: ~120 kB.

## Backend: run the notebook from the dashboard

The **Fuente de datos** dialog can upload a LAPD CSV and run the Unit 3 notebook
asynchronously. The Angular app polls the job and applies the returned dashboard
payload without a reload.

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r server/requirements.txt

export LAPD_NOTEBOOK_PATH="/absolute/path/to/Arquitectura_Redes_Neuronales_Perfilamiento_Delictivo.ipynb"
export LAPD_JOBS_DIR="/absolute/path/to/jobs"
export LAPD_CORS_ORIGINS="http://localhost:4200"

uvicorn server.main:app --host 0.0.0.0 --port 8000
```

Set the API base at runtime before the app loads:

```html
<script>
  globalThis.__LAPD_API_BASE__ = 'https://your-api.example.com';
</script>
```

See `server/README.md` for endpoints, limits, and deployment notes.

## Regenerate the local seed

```bash
python3 server/build_seed.py \
  --raw /path/to/Crime_Data_from_2020_to_Present.csv \
  --outputs /path/to/notebook/outputs \
  --panel-rows 213624 --train-rows 150870 --valid-rows 31338 \
  --usable-rows 848979 --panel-zones 1102 \
  --profile-incidents '{"P01":221643,"P02":138433,"P03":67671,"P04":245419,"P05":22527,"P06":145729}'
```
