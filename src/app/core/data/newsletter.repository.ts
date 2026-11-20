import { inject, Injectable } from '@angular/core';
import { ApiClient } from '../api/api-client';
import { I18nService } from '../i18n/i18n.service';

export interface NewsletterReceipt {
  subscribed: boolean;
}

/** Subscrição pública de novidades. O backend é idempotente por email. */
@Injectable({ providedIn: 'root' })
export class NewsletterRepository {
  private readonly api = inject(ApiClient);
  private readonly i18n = inject(I18nService);

  async subscribe(email: string): Promise<NewsletterReceipt> {
    try {
      const response = await this.api.post<NewsletterReceipt>('/public/newsletter', {
        email: email.trim(),
      });
      return { subscribed: response?.subscribed !== false };
    } catch {
      throw new Error(this.i18n.t('newsletter.error.generic'));
    }
  }
}
