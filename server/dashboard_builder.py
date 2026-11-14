"""Normalize Unit 3 notebook outputs into the Angular dashboard contract.

The notebook exports CSV artifacts per run. This module reads those artifacts
plus the uploaded LAPD CSV and produces a single JSON-serializable payload.
"""

from __future__ import annotations

import math
import re
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import numpy as np
import pandas as pd

from server.operational_builder import build_operational

PROFILE_CODES = ["P01", "P02", "P03", "P04", "P05", "P06"]
PROFILE_LABELS = {
    "P01": "Delitos Vehiculares y Movilidad",
    "P02": "Robo y Hurto Patrimonial",
    "P03": "Robos Residenciales e Intrusión",
    "P04": "Delitos Contra la Vida y la Integridad",
    "P05": "Delitos Sexuales",
    "P06": "Fraude, Vandalismo y Daños",
}
CATEGORY_ORDER = ["Patrimonio", "Personas", "Vandalismo", "Fraude", "Sexuales", "Otros"]
PREMISE_GROUPS = ["VIA_PUBLICA", "RESIDENCIA", "COMERCIO", "VEHICULO", "ESPACIO_PUBLICO", "OTROS"]
PREMISE_LABELS = {
    "VIA_PUBLICA": "Vía pública",
    "RESIDENCIA": "Residencia",
    "COMERCIO": "Comercio",
    "VEHICULO": "Vehículo",
    "ESPACIO_PUBLICO": "Espacio público",
    "OTROS": "Otros",
}
PREMISE_RULES = [
    ("VIA_PUBLICA", r"STREET|SIDEWALK|ALLEY|HIGHWAY|FREEWAY|PARKING|DRIVEWAY|BUS STOP|TRANSIT|ROAD|AVENUE|BLVD|BOULEVARD|ON STREET"),
    ("RESIDENCIA", r"RESIDENCE|HOUSE|APARTMENT|CONDO|GARAGE|YARD|PORCH|HOTEL|MOTEL|DWELLING|TRAILER|SINGLE FAMILY"),
    ("COMERCIO", r"STORE|SHOP|BUSINESS|BANK|RESTAURANT|BAR|OFFICE|MALL|MARKET|GAS STATION|RETAIL|SALON|LIQUOR|DEPARTMENT"),
    ("VEHICULO", r"VEHICLE|AUTO|CAR |TRUCK|BUS|MOTORCYCLE|BICYCLE|BIKE|MTA"),
    ("ESPACIO_PUBLICO", r"PARK|BEACH|PLAYGROUND|SCHOOL|CHURCH|HOSPITAL|LIBRARY|COLLEGE|UNIVERSITY|STADIUM|CEMETERY"),
]

# Geographic and map metadata kept from the existing Angular prototype.
DIVISION_META: dict[str, dict[str, Any]] = {
    "CENTRAL": {"code": "D-01", "name": "Central", "bureau": "Central", "x": 618.1, "y": 451.6, "lat": 34.0466, "lng": -118.2437},
    "RAMPART": {"code": "D-02", "name": "Rampart", "bureau": "Central", "x": 584.9, "y": 436.3, "lat": 34.0567, "lng": -118.2701},
    "SOUTHWEST": {"code": "D-03", "name": "Southwest", "bureau": "South", "x": 543.5, "y": 505.5, "lat": 34.011, "lng": -118.303},
    "HOLLENBECK": {"code": "D-04", "name": "Hollenbeck", "bureau": "Central", "x": 636.6, "y": 454.0, "lat": 34.045, "lng": -118.229},
    "HARBOR": {"code": "D-05", "name": "Harbor", "bureau": "South", "x": 557.3, "y": 923.2, "lat": 33.735, "lng": -118.292},
    "HOLLYWOOD": {"code": "D-06", "name": "Hollywood", "bureau": "West", "x": 504.5, "y": 376.8, "lat": 34.096, "lng": -118.334},
    "WILSHIRE": {"code": "D-07", "name": "Wilshire", "bureau": "West", "x": 503.2, "y": 452.5, "lat": 34.046, "lng": -118.335},
    "WEST LA": {"code": "D-08", "name": "West LA", "bureau": "West", "x": 362.3, "y": 463.1, "lat": 34.039, "lng": -118.447},
    "VAN NUYS": {"code": "D-09", "name": "Van Nuys", "bureau": "Valley", "x": 358.5, "y": 246.7, "lat": 34.182, "lng": -118.45},
    "N HOLLYWOOD": {"code": "D-10", "name": "North Hollywood", "bureau": "Valley", "x": 450.4, "y": 261.8, "lat": 34.172, "lng": -118.377},
    "FOOTHILL": {"code": "D-11", "name": "Foothill", "bureau": "Valley", "x": 413.9, "y": 128.6, "lat": 34.26, "lng": -118.406},
    "DEVONSHIRE": {"code": "D-12", "name": "Devonshire", "bureau": "Valley", "x": 264.2, "y": 158.9, "lat": 34.24, "lng": -118.525},
    "TOPANGA": {"code": "D-13", "name": "Topanga", "bureau": "Valley", "x": 157.3, "y": 174.0, "lat": 34.23, "lng": -118.61},
    "WEST VALLEY": {"code": "D-14", "name": "West Valley", "bureau": "Valley", "x": 222.7, "y": 228.5, "lat": 34.194, "lng": -118.558},
    "MISSION": {"code": "D-15", "name": "Mission", "bureau": "Valley", "x": 333.4, "y": 113.5, "lat": 34.27, "lng": -118.47},
    "OLYMPIC": {"code": "D-16", "name": "Olympic", "bureau": "West", "x": 558.6, "y": 446.5, "lat": 34.05, "lng": -118.291},
    "NEWTON": {"code": "D-17", "name": "Newton", "bureau": "Central", "x": 606.4, "y": 504.0, "lat": 34.012, "lng": -118.253},
    "PACIFIC": {"code": "D-18", "name": "Pacific", "bureau": "West", "x": 385.0, "y": 513.8, "lat": 34.0055, "lng": -118.429},
    "NORTHEAST": {"code": "D-19", "name": "Northeast", "bureau": "Central", "x": 620.2, "y": 392.0, "lat": 34.086, "lng": -118.242},
    "77TH STREET": {"code": "D-20", "name": "77th Street", "bureau": "South", "x": 574.9, "y": 567.5, "lat": 33.97, "lng": -118.278},
    "SOUTHEAST": {"code": "D-21", "name": "Southeast", "bureau": "South", "x": 577.5, "y": 616.0, "lat": 33.938, "lng": -118.276},
}
AREA_ALIASES = {"N HOLLYWOOD": "N HOLLYWOOD"}


def _canonical_area(value: Any) -> str:
    text = str(value).strip().upper()
    return AREA_ALIASES.get(text, text)


def _parse_lapd_dates(series: pd.Series) -> pd.Series:
    s = series.astype("string").str.strip()
    sample = s.dropna().head(50000)
    parts = sample.str.extract(r"^(\d{1,2})[/-](\d{1,2})[/-](\d{4})")
    first = pd.to_numeric(parts[0], errors="coerce")
    second = pd.to_numeric(parts[1], errors="coerce")
    dayfirst = bool((first > 12).sum() >= (second > 12).sum()) if len(parts) else True
    if dayfirst:
        formats = ["%d/%m/%Y %H:%M", "%d/%m/%Y", "%d-%m-%Y %H:%M", "%d-%m-%Y"]
    else:
        formats = ["%m/%d/%Y %H:%M", "%m/%d/%Y", "%m-%d-%Y %H:%M", "%m-%d-%Y"]
    formats += ["%Y-%m-%d %H:%M:%S", "%Y-%m-%d"]
    out = pd.Series(pd.NaT, index=s.index, dtype="datetime64[ns]")
    for fmt in formats:
        if out.notna().all():
            break
        out = out.fillna(pd.to_datetime(s, format=fmt, errors="coerce"))
    return out.fillna(pd.to_datetime(s, errors="coerce", dayfirst=dayfirst))


def _premise_group(desc: Any) -> str:
    text = str(desc).upper()
    for label, pattern in PREMISE_RULES:
        if re.search(pattern, text):
            return label
    return "OTROS"


def _category_for(profile: str, submodalidad: Any) -> str:
    if profile in {"P01", "P02", "P03"}:
        return "Patrimonio"
    if profile == "P04":
        return "Personas"
    if profile == "P05":
        return "Sexuales"
    if profile == "P06":
        return "Fraude" if str(submodalidad) == "FRAUDE_IDENTIDAD" else "Vandalismo"
    return "Otros"


def _read_required(output_dir: Path, filename: str) -> pd.DataFrame:
    path = output_dir / filename
    if not path.exists():
        raise FileNotFoundError(f"Notebook output not found: {path}")
    return pd.read_csv(path)


def _load_catalog(output_dir: Path) -> pd.DataFrame:
    catalog = _read_required(output_dir, "catalogo_perfiles.csv")
    catalog.columns = [str(c).strip().lower() for c in catalog.columns]
    catalog = catalog.rename(
        columns={
            "perfil": "code",
            "nombre": "name",
            "descripcion": "description",
            "submodalidades": "submodalities",
            "peso_severidad": "severity",
        }
    )
    return catalog


def _load_audit(output_dir: Path) -> pd.DataFrame:
    audit = _read_required(output_dir, "auditoria_tipificaciones.csv")
    audit.columns = [str(c).strip().lower() for c in audit.columns]
    audit = audit.rename(columns={"crime_description": "crime_description", "perfil": "profile", "submodalidad": "subprofile"})
    return audit


def _prepare_incidents(raw_csv_path: Path, output_dir: Path) -> tuple[pd.DataFrame, pd.DataFrame]:
    # Match the notebook's selected columns before removing duplicate incidents.
    usecols = {"date_reported", "date_occurred", "reporting_district", "area_name",
               "crime_description", "premise_description", "weapon_description",
               "modus_operandi", "latitude", "longitude", "victim_age", "victim_sex", "victim_descent"}
    raw = pd.read_csv(raw_csv_path, usecols=lambda c: str(c).strip().lower() in usecols, low_memory=False)
    raw.columns = raw.columns.str.strip().str.lower()
    raw_rows = len(raw)

    for column in ["crime_description", "premise_description", "weapon_description", "area_name", "reporting_district", "modus_operandi", "victim_sex", "victim_descent"]:
        if column not in raw:
            raw[column] = "NO_REGISTRADO"
        raw[column] = (
            raw[column]
            .astype("string")
            .str.strip()
            .str.upper()
            .fillna("NO_REGISTRADO")
            .replace({"": "NO_REGISTRADO", "NAN": "NO_REGISTRADO", "NONE": "NO_REGISTRADO"})
        )

    raw["date_occurred"] = _parse_lapd_dates(raw["date_occurred"]) if "date_occurred" in raw else pd.NaT
    raw["date_reported"] = _parse_lapd_dates(raw["date_reported"]) if "date_reported" in raw else pd.NaT
    raw["month"] = raw["date_occurred"].dt.to_period("M")
    raw["hour"] = raw["date_occurred"].dt.hour
    raw["weekday"] = raw["date_occurred"].dt.dayofweek
    raw["night"] = raw["hour"].between(20, 23) | raw["hour"].between(0, 5)
    raw["weekend"] = raw["weekday"].isin([5, 6])
    raw["report_delay_days"] = (
        raw["date_reported"].dt.normalize() - raw["date_occurred"].dt.normalize()
    ).dt.days
    raw["same_day_report"] = raw["report_delay_days"].eq(0)
    raw["report_delay_negative"] = raw["report_delay_days"].lt(0)
    raw["has_weapon"] = (~raw["weapon_description"].isin(["NO_REGISTRADO", "NONE", "UNKNOWN"])).astype("int8")
    raw["premise_group"] = raw["premise_description"].map(_premise_group)

    for column in ["latitude", "longitude"]:
        if column not in raw:
            raw[column] = np.nan
        raw[column] = pd.to_numeric(raw[column], errors="coerce")
        for _ in range(7):
            mask = raw[column].abs() > (90 if column == "latitude" else 180)
            if not mask.any():
                break
            raw.loc[mask, column] = raw.loc[mask, column] / 10

    raw["valid_geo"] = (
        raw["latitude"].between(-90, 90)
        & raw["longitude"].between(-180, 180)
        & ~((raw["latitude"] == 0) & (raw["longitude"] == 0))
    )

    if "victim_age" in raw:
        raw["victim_age"] = pd.to_numeric(raw["victim_age"], errors="coerce")
    raw = raw.drop_duplicates()
    raw = raw[raw["area_name"].ne("NO_REGISTRADO") & raw["month"].notna()].copy()
    last_month = raw["month"].max()
    raw = raw[raw["month"] < last_month].copy()
    raw["area_name"] = raw["area_name"].map(_canonical_area)

    audit = _load_audit(output_dir)
    raw = raw.merge(audit[["crime_description", "profile", "subprofile"]], on="crime_description", how="left")
    raw["crime_profile"] = raw["profile"].fillna("NO_ASIGNADO")
    raw["crime_subprofile"] = raw["subprofile"].fillna("SIN_PERFIL")
    raw = raw.drop(columns=["profile", "subprofile"])
    raw["category"] = [
        _category_for(profile, subprofile)
        for profile, subprofile in zip(raw["crime_profile"], raw["crime_subprofile"], strict=False)
    ]

    raw["zone"] = (
        raw["reporting_district"]
        .astype("string")
        .str.strip()
        .replace({"NO_REGISTRADO": pd.NA, "": pd.NA, "0": pd.NA, "NAN": pd.NA})
        .fillna(raw["area_name"])
    )
    raw["raw_rows"] = raw_rows
    return raw, audit


def _pct(series: pd.Series) -> float:
    if len(series) == 0:
        return 0.0
    return float(series.mean() * 100)


def _safe_round(value: float, digits: int = 2) -> float:
    if value is None or (isinstance(value, float) and math.isnan(value)):
        return 0.0
    return round(float(value), digits)


def build_dashboard(
    raw_csv_path: Path,
    output_dir: Path,
    *,
    job_id: str | None = None,
    dataset_name: str | None = None,
    panel_rows: int | None = None,
    train_rows: int | None = None,
    valid_rows: int | None = None,
    usable_rows: int | None = None,
    panel_zones: int | None = None,
    profile_incidents: dict[str, int] | None = None,
) -> dict[str, Any]:
    incidents, audit = _prepare_incidents(raw_csv_path, output_dir)
    catalog = _load_catalog(output_dir)
    summary = _read_required(output_dir, "perfil_zona_resumen.csv")
    long = _read_required(output_dir, "perfil_zona_largo.csv")
    results = _read_required(output_dir, "resultados_modelos.csv")
    predictions = _read_required(output_dir, "predicciones_test.csv")

    results.columns = [str(c).strip().lower() for c in results.columns]
    predictions.columns = [str(c).strip().lower() for c in predictions.columns]
    summary.columns = [str(c).strip().lower() for c in summary.columns]
    long.columns = [str(c).strip().lower() for c in long.columns]

    zone_area = (
        incidents.groupby("zone")["area_name"]
        .agg(lambda values: values.mode().iloc[0] if not values.mode().empty else "NO_REGISTRADO")
    )
    predictions["area_name"] = predictions["zone"].astype("string").map(zone_area)
    predictions = predictions[predictions["area_name"].notna()].copy()
    predictions["abs_error"] = (predictions["target_next_month"] - predictions["mlp"]).abs()

    last_target = str(predictions["target_month"].max())
    last_target_period = pd.Period(last_target, freq="M")
    previous_period = last_target_period - 1

    assigned = incidents[incidents["crime_profile"].isin(PROFILE_CODES)].copy()
    profile_matrix = pd.crosstab(assigned["area_name"], assigned["crime_profile"]).reindex(
        columns=PROFILE_CODES, fill_value=0
    )
    profile_shares = profile_matrix.div(profile_matrix.sum(axis=1).replace(0, np.nan), axis=0).fillna(0)
    dominant_profile = profile_matrix.idxmax(axis=1)
    dominant_share = profile_shares.max(axis=1) * 100

    ranking = _read_required(output_dir, "ranking_zona_perfil.csv")
    ranking.columns = [str(c).strip().lower() for c in ranking.columns]
    ranking["area_name"] = ranking["zone"].astype("string").map(zone_area)
    priority_profile: dict[str, str] = {}
    priority_score: dict[str, float] = {}
    for area, group in ranking.dropna(subset=["area_name"]).groupby("area_name"):
        best = group.loc[group["priority_score"].idxmax()]
        priority_profile[area] = str(best["crime_profile"])
        priority_score[area] = float(best["priority_score"])

    category_matrix = pd.crosstab(incidents["area_name"], incidents["category"]).reindex(
        columns=CATEGORY_ORDER, fill_value=0
    )
    category_shares = category_matrix.div(category_matrix.sum(axis=1).replace(0, np.nan), axis=0).fillna(0)

    premise_matrix = pd.crosstab(incidents["area_name"], incidents["premise_group"]).reindex(
        columns=PREMISE_GROUPS, fill_value=0
    )
    premise_shares = premise_matrix.div(premise_matrix.sum(axis=1).replace(0, np.nan), axis=0).fillna(0)

    area_metrics = incidents.groupby("area_name").agg(
        night=("night", "mean"),
        weekend=("weekend", "mean"),
        weapon=("has_weapon", "mean"),
    )
    recent_end = incidents["month"].max()
    recent_start = recent_end - 11
    area_inc12 = (
        incidents[
            (incidents["month"] >= recent_start)
            & (incidents["month"] <= recent_end)
        ]
        .groupby("area_name")
        .size()
    )
    area_prev = incidents[incidents["month"] == previous_period].groupby("area_name").size()
    area_forecast = (
        predictions[predictions["target_month"] == last_target]
        .groupby("area_name")["mlp"]
        .sum()
    )
    area_mae = predictions.groupby("area_name")["abs_error"].mean()

    spark_periods = pd.period_range(end=last_target_period, periods=12, freq="M")
    monthly_counts = incidents.groupby(["area_name", "month"]).size()

    operational = build_operational(incidents, predictions, summary, long, ranking, output_dir)
    zones: list[dict[str, Any]] = []
    for area_key, meta in DIVISION_META.items():
        area_name = area_key
        display_name = meta["name"]
        profile = str(dominant_profile.get(area_name, "P04"))
        if profile not in PROFILE_CODES:
            profile = "P04"
        forecast = float(area_forecast.get(area_name, 0.0))
        prev = float(area_prev.get(area_name, 0.0))
        delta = ((forecast - prev) / prev * 100) if prev else 0.0
        spark = []
        for period in spark_periods:
            spark.append(int(monthly_counts.get((area_name, period), 0)))
        zones.append(
            {
                "analytics": operational.get(area_name),
                "estimateMonth": last_target,
                "previousMonth": str(previous_period),
                "code": meta["code"],
                "name": display_name,
                "bureau": meta["bureau"],
                "profile": profile,
                "profileName": PROFILE_LABELS.get(profile, "Sin perfil"),
                "profileShare": _safe_round(dominant_share.get(area_name, 0.0), 2),
                "profileShares": {
                    code: _safe_round(profile_shares.at[area_name, code] * 100, 2)
                    if area_name in profile_shares.index
                    else 0.0
                    for code in PROFILE_CODES
                },
                "priorityProfile": priority_profile.get(area_name, profile),
                "priorityScore": _safe_round(priority_score.get(area_name, 0.0), 3),
                "x": meta["x"],
                "y": meta["y"],
                "lat": meta["lat"],
                "lng": meta["lng"],
                "inc12": int(area_inc12.get(area_name, 0)),
                "prev": int(prev),
                "forecast": int(round(forecast)),
                "deltaPct": _safe_round(delta, 1),
                "mae": _safe_round(area_mae.get(area_name, 0.0), 3),
                "night": _safe_round(area_metrics.at[area_name, "night"] * 100, 1)
                if area_name in area_metrics.index
                else 0.0,
                "weekend": _safe_round(area_metrics.at[area_name, "weekend"] * 100, 1)
                if area_name in area_metrics.index
                else 0.0,
                "weapon": _safe_round(area_metrics.at[area_name, "weapon"] * 100, 1)
                if area_name in area_metrics.index
                else 0.0,
                "mix": [
                    {
                        "k": category,
                        "v": _safe_round(category_shares.at[area_name, category] * 100, 2)
                        if area_name in category_shares.index
                        else 0.0,
                    }
                    for category in CATEGORY_ORDER
                ],
                "premises": [
                    {
                        "k": PREMISE_LABELS[group],
                        "v": _safe_round(premise_shares.at[area_name, group] * 100, 2)
                        if area_name in premise_shares.index
                        else 0.0,
                    }
                    for group in PREMISE_GROUPS
                ],
                "spark": spark,
            }
        )

    total_assigned = (
        sum(int(value) for value in profile_incidents.values())
        if profile_incidents
        else len(assigned)
    )
    profiles: list[dict[str, Any]] = []
    for code in PROFILE_CODES:
        profile_rows = assigned[assigned["crime_profile"] == code]
        incident_count = (
            int(profile_incidents[code])
            if profile_incidents and code in profile_incidents
            else len(profile_rows)
        )
        catalog_row = catalog[catalog["code"] == code]
        name = str(catalog_row.iloc[0]["name"]) if not catalog_row.empty else PROFILE_LABELS[code]
        description = str(catalog_row.iloc[0]["description"]) if not catalog_row.empty else ""
        profiles.append(
            {
                "code": code,
                "name": name,
                "description": description,
                "principalZones": int((summary["perfil_principal"] == code).sum()),
                "priorityZones": int((summary["perfil_prioritario"] == code).sum()),
                "incidents": incident_count,
                "sharePct": _safe_round(incident_count / total_assigned * 100, 2) if total_assigned else 0.0,
                "nightPct": _safe_round(_pct(profile_rows["night"]), 1),
                "weaponPct": _safe_round(_pct(profile_rows["has_weapon"]), 1),
                "mae": _safe_round(
                    predictions[predictions["crime_profile"] == code]["abs_error"].mean(), 3
                ),
                "priorityAvg": _safe_round(
                    long[long["crime_profile"] == code]["priority_score"].mean(), 3
                ),
            }
        )

    persistence = predictions["persistencia"]
    target = predictions["target_next_month"]
    persistence_mae = float((target - persistence).abs().mean())
    persistence_rmse = float(np.sqrt(((target - persistence) ** 2).mean()))
    persistence_r2 = float(
        1 - ((target - persistence) ** 2).sum() / ((target - target.mean()) ** 2).sum()
    )
    model_rows = []
    for _, row in results.iterrows():
        model_rows.append(
            {
                "name": str(row["modelo"]),
                "mae": _safe_round(float(row["mae"]), 4),
                "rmse": _safe_round(float(row["rmse"]), 4),
                "r2": _safe_round(float(row["r2"]), 4),
            }
        )
    if not any(row["name"].casefold() == "persistencia" for row in model_rows):
        model_rows.append(
            {
                "name": "Persistencia",
                "mae": _safe_round(persistence_mae, 4),
                "rmse": _safe_round(persistence_rmse, 4),
                "r2": _safe_round(persistence_r2, 4),
            }
        )
    best_mae = min(row["mae"] for row in model_rows)
    for row in model_rows:
        row["isBest"] = row["mae"] == best_mae

    audit_top = audit.sort_values("incidentes", ascending=False).head(8)
    typifications = [
        {"code": str(row["crime_description"]), "percentage": _safe_round(float(row["porcentaje"]), 2)}
        for _, row in audit_top.iterrows()
    ]

    global_mix = {
        category: _safe_round(float((incidents["category"] == category).mean() * 100), 2)
        for category in CATEGORY_ORDER
    }
    coverage = float(incidents["crime_profile"].ne("NO_ASIGNADO").mean() * 100)
    raw_rows = int(incidents["raw_rows"].iloc[0]) if len(incidents) else 0
    usable_total = int(usable_rows) if usable_rows is not None else int(len(incidents))
    panel_zone_total = int(panel_zones) if panel_zones is not None else int(len(summary))
    count_scale = (usable_total / len(incidents)) if len(incidents) else 1.0
    valid_geo_total = int(round(int(incidents["valid_geo"].sum()) * count_scale))
    same_day_total = int(round(int(incidents["same_day_report"].sum()) * count_scale))
    scope = [
        {"concept": "Filas crudas", "value": f"{raw_rows:,}".replace(",", ".")},
        {"concept": "Incidentes utilizables", "value": f"{usable_total:,}".replace(",", ".")},
        {"concept": "Zonas en el panel", "value": f"{panel_zone_total:,}".replace(",", ".")},
        {"concept": "Zonas con perfil principal", "value": f"{len(summary):,}".replace(",", ".")},
        {"concept": "Tipificaciones", "value": f"{incidents['crime_description'].nunique():,}".replace(",", ".")},
        {"concept": "Con coordenadas válidas", "value": f"{valid_geo_total:,}".replace(",", ".")},
        {"concept": "Denuncia el mismo día", "value": f"{same_day_total:,}".replace(",", ".")},
        {"concept": "Demoras negativas", "value": f"{int(incidents['report_delay_negative'].sum()):,}".replace(",", ".")},
        {"concept": "Cobertura del perfilamiento", "value": f"{coverage:.2f} %".replace(".", ",")},
    ]

    generated_at = datetime.now(timezone.utc).isoformat()
    return {
        "zones": zones,
        "profiles": profiles,
        "profileCatalog": [
            {
                "code": str(row["code"]),
                "name": str(row["name"]),
                "description": str(row["description"]),
                "submodalities": str(row["submodalities"]),
                "severity": float(row["severity"]),
            }
            for _, row in catalog.iterrows()
        ],
        "models": model_rows,
        "typifications": typifications,
        "scope": scope,
        "globalMix": global_mix,
        "premiseLabels": PREMISE_LABELS,
        "modelRun": {
            "jobId": job_id,
            "datasetName": dataset_name or raw_csv_path.name,
            "generatedAt": generated_at,
            "rawRows": raw_rows,
            "usableRows": usable_total,
            "testRows": int(len(predictions)),
            "panelRows": panel_rows,
            "trainRows": train_rows,
            "validRows": valid_rows,
            "profileZones": int(len(summary)),
            "coveragePct": _safe_round(coverage, 2),
        },
    }
