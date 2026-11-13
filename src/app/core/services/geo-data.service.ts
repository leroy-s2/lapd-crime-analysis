import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, shareReplay } from 'rxjs';
import type { FeatureCollection, Geometry } from 'geojson';

export interface LapdDivisionProperties {
  OBJECTID: number;
  APREC: string;
  PREC: number;
  AREA: number;
  PERIMETER: number;
  Shape__Are?: number;
  Shape__Len?: number;
}

export type LapdGeoJson = FeatureCollection<Geometry, LapdDivisionProperties>;

@Injectable({
  providedIn: 'root',
})
export class GeoDataService {
  private readonly http = inject(HttpClient);
  private cachedGeoJson$?: Observable<LapdGeoJson>;

  getLapdDivisionsGeoJson(): Observable<LapdGeoJson> {
    if (!this.cachedGeoJson$) {
      this.cachedGeoJson$ = this.http
        .get<LapdGeoJson>('data/lapd-divisions.geojson')
        .pipe(shareReplay(1));
    }
    return this.cachedGeoJson$;
  }
}

