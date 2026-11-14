"""Small, chart-ready aggregates for officers, from the notebook's real outputs."""
from pathlib import Path
import pandas as pd


def build_operational(incidents, predictions, summary, long, ranking, output_dir: Path):
    matrix = pd.read_csv(output_dir / 'matriz_zona_perfil.csv')
    averages = pd.read_csv(output_dir / 'predicciones_zona_perfil.csv')
    hotspots = pd.read_csv(output_dir / 'hotspots_perfil.csv')
    result = {}
    for area, rows in incidents.groupby('area_name'):
        zone_ids = set(rows['zone'].astype(str))
        total = len(rows)
        top = rows['crime_description'].value_counts().head(8)
        monthly = rows.groupby('month').size()
        comparison = predictions[predictions['area_name'] == area].groupby('target_month')[['target_next_month', 'mlp']].sum()
        area_summary = summary[summary['zone'].astype(str).isin(zone_ids)]
        area_hotspots = hotspots[hotspots['zona_principal'].astype(str).isin(zone_ids)].sort_values('incidentes', ascending=False).head(8)
        area_matrix = matrix[matrix['zone'].astype(str).isin(zone_ids)]
        profile_counts = {p: int(area_matrix[p].sum()) for p in ['P01','P02','P03','P04','P05','P06']}
        area_ranking = ranking[ranking['zone'].astype(str).isin(zone_ids)].sort_values('priority_score', ascending=False).drop_duplicates('zone').head(8)
        area_averages = averages[averages['zone'].astype(str).isin(zone_ids)]
        result[area] = {
            'total': total,
            'startMonth': str(monthly.index.min()), 'endMonth': str(monthly.index.max()),
            'topCrimes': [{'label': str(k), 'count': int(v), 'share': round(v / total * 100, 2)} for k, v in top.items()],
            'monthly': [{'month': str(k), 'count': int(v)} for k, v in monthly.items()],
            'hours': [{'label': f'{h:02d}:00', 'count': int((rows['hour'] == h).sum())} for h in range(24)],
            'weekdays': [{'label': label, 'count': int((rows['weekday'] == d).sum())} for d, label in enumerate(['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'])],
            'comparison': [{'month': str(k), 'observed': int(v['target_next_month']), 'estimated': round(v['mlp'])} for k, v in comparison.iterrows()],
            'profileCounts': {p: int((rows['crime_profile'] == p).sum()) for p in profile_counts},
            'calibrationProfileCounts': profile_counts,
            'reportZones': [{'zone': str(r.zone), 'count': int(r.incidentes_totales), 'profile': str(r.perfil_principal), 'share': round(r.perfil_principal_share * 100, 1)} for r in area_summary.sort_values('incidentes_totales', ascending=False).head(8).itertuples()],
            'priorities': [{'zone': str(r.zone), 'profile': str(r.crime_profile), 'score': round(r.priority_score, 3), 'count': int(r.incidentes)} for r in area_ranking.itertuples()],
            'hotspots': [{'id': str(r.hotspot_id), 'lat': float(r.lat_grid), 'lng': float(r.lon_grid), 'count': int(r.incidentes), 'profile': str(r.perfil_principal), 'zone': str(r.zona_principal)} for r in area_hotspots.itertuples()],
            'averageObserved': round(float(area_averages['observado_medio'].sum()), 1),
            'averageEstimated': round(float(area_averages['predicho_medio'].sum()), 1),
        }
    return result
