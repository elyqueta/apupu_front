/**
 * Bloco 15B — harness de validação visual dos 19 templates de sistema.
 *
 * Rota interna `__test/templates`: auto-contida, sem backend nem sessão.
 * Usa o catálogo canónico `SYSTEM_TEMPLATES` e o `TemplateRendererComponent`
 * real em modo `invite` (documento v2), para que os e2e meçam o mesmo
 * conteúdo que o convite mostra, incluindo blocos de texto, botões e timeline.
 */
import { Component } from '@angular/core';
import { SYSTEM_TEMPLATES } from '../../../core/data/system-templates';
import type { EventTemplate } from '../../../core/models/models';
import {
  TemplateRendererComponent,
  TemplateRenderData,
} from '../../../shared/components/template-renderer.component';

@Component({
  selector: 'app-templates-test-page',
  standalone: true,
  imports: [TemplateRendererComponent],
  styles: [
    `
      :host {
        display: block;
        box-sizing: border-box;
        width: 100%;
        max-width: 100%;
        padding: 8px;
        background: #fff;
        color: #111;
      }
      .cases {
        display: flex;
        flex-direction: column;
        gap: 12px;
        width: 100%;
        max-width: 100%;
      }
      .case {
        box-sizing: border-box;
        width: 100%;
        max-width: 100%;
        padding: 8px;
        border: 1px solid #cbd5e1;
        border-radius: 12px;
      }
      .case-label {
        margin: 0 0 6px;
        font: 12px/1.4 monospace;
        color: #334155;
      }
      .renderer {
        box-sizing: border-box;
        width: 100%;
        max-width: 100%;
        border-radius: 12px;
      }
    `,
  ],
  template: `
    <main class="cases">
      @for (template of templates; track template.slug) {
        <section class="case" [attr.data-template-slug]="template.slug" data-testid="template-case">
          <p class="case-label">{{ template.slug }}</p>
          <div class="renderer" data-testid="template-card">
            <app-template-renderer [manifest]="template.manifest" [data]="renderData(template)" mode="invite" />
          </div>
        </section>
      }
    </main>
  `,
})
export class TemplatesTestPage {
  protected readonly templates: EventTemplate[] = SYSTEM_TEMPLATES;

  /** Mesma leitura de `previewData` usada pelo catálogo (`templates.page.ts`). */
  protected renderData(template: EventTemplate): TemplateRenderData {
    const preview = template.manifest.previewData ?? {};
    return {
      title: preview['title'] ?? 'Convite',
      hostName: preview['hostName'] ?? 'Anfitrião',
      startsAt: preview['startsAt'] ?? '2026-12-20T16:00:00.000Z',
      endsAt: preview['endsAt'] ?? null,
      timezone: preview['timezone'] ?? 'Africa/Luanda',
      city: preview['city'] ?? 'Luanda',
      venue: preview['venue'] ?? 'Luanda',
      message: preview['message'] ?? template.description ?? '',
      dressCode: preview['dressCode'] ?? '',
      templateSlug: preview['templateSlug'] ?? template.slug,
      type: preview['type'] ?? 'other',
    };
  }
}
