import { inject, Injectable } from '@angular/core';
import { ApiClient } from '../api/api-client';
import { DashboardData } from '../api/api.models';
import { CachedRepository } from './cached-repository';

/** Resumo do painel (`GET /host/dashboard`): próximo evento e totais. */
@Injectable({ providedIn: 'root' })
export class DashboardRepository extends CachedRepository<DashboardData> {
  private readonly api = inject(ApiClient);

  protected fetch(): Promise<DashboardData> {
    return this.api.get<DashboardData>('/host/dashboard');
  }
}
