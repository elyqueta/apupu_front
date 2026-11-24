import { I18nService } from '../../core/i18n/i18n.service';

/**
 * Texto da meta Partilhado por WhatsApp.
 *
 * A data guardada é o momento em que o anfitrião abriu o WhatsApp com o link
 * individual — não confirma que a mensagem foi enviada nem lida.
 */
export function whatsappSharedLabel(i18n: I18nService, sharedAt: string | null): string | null {
  if (!sharedAt) {
    return null;
  }
  const timestamp = new Date(sharedAt).getTime();
  if (Number.isNaN(timestamp)) {
    return null;
  }
  const days = Math.max(0, Math.floor((Date.now() - timestamp) / 86_400_000));
  return i18n.t('block9.guests.whatsappShared', { count: days });
}
