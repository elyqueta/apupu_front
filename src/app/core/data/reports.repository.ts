import { inject, Injectable } from '@angular/core';
import { ApiClient, DownloadFile } from '../api/api-client';
import { ReportSummary } from '../api/api.models';
import { CachedRepository } from './cached-repository';

export type ReportExportFormat = 'pdf' | 'csv';

/** Resumo de relatórios (`GET /host/reports/summary`). */
@Injectable({ providedIn: 'root' })
export class ReportsRepository extends CachedRepository<ReportSummary> {
  private readonly api = inject(ApiClient);

  protected fetch(): Promise<ReportSummary> {
    return this.api.get<ReportSummary>('/host/reports/summary');
  }

  /**
   * Exporta o resumo no servidor.
   *
   * O PDF e o CSV são gerados com a identidade visual do Conto Contigo,
   * por isso o cliente só descarrega o ficheiro devolvido.
   */
  export(format: ReportExportFormat): Promise<DownloadFile> {
    return this.api.download('/host/reports/export', { format });
  }
}
