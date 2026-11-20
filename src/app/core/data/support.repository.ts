import { inject, Injectable } from '@angular/core';
import { ApiClient } from '../api/api-client';
import { I18nService } from '../i18n/i18n.service';

export interface SupportRequest {
  name: string;
  email: string;
  message: string;
}

export interface SupportReceipt {
  id: string;
  created_at: string;
}

interface SupportReceiptDto {
  id?: string;
  created_at?: string;
  createdAt?: string;
}

/** Envio público de mensagens de apoio para a equipa da plataforma. */
@Injectable({ providedIn: 'root' })
export class SupportRepository {
  private readonly api = inject(ApiClient);
  private readonly i18n = inject(I18nService);

  async send(request: SupportRequest): Promise<SupportReceipt> {
    try {
      const response = await this.api.post<SupportReceiptDto>('/public/support', {
        name: request.name.trim(),
        email: request.email.trim(),
        message: request.message.trim(),
      });
      return {
        id: response.id ?? '',
        created_at: response.created_at ?? response.createdAt ?? '',
      };
    } catch {
      // Um erro de rede, validação ou servidor não deve expor detalhes
      // técnicos na interface pública. A validação de campo é feita no modal.
      throw new Error(this.i18n.t('support.error.generic'));
    }
  }
}
