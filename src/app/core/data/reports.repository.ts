import { inject, Injectable } from '@angular/core';
import { ApiClient } from '../api/api-client';
import { ReportSummary } from '../api/api.models';
import { CachedRepository } from './cached-repository';

/** Resumo de relatórios (`GET /host/reports/summary`). */
@Injectable({ providedIn: 'root' })
export class ReportsRepository extends CachedRepository<ReportSummary> {
  private readonly api = inject(ApiClient);

  protected fetch(): Promise<ReportSummary> {
    return this.api.get<ReportSummary>('/host/reports/summary');
  }
}
