import { EventStatus, EventType, RsvpStatus } from '../../core/models/models';

/** Dados bancários mostrados apenas quando a contribuição está ativa. */
export interface InvitationBankDetails {
  bankName: string;
  accountHolder: string;
  accountReference: string;
}

/** Vista pública do evento, já sem campos sensíveis do perfil do anfitrião. */
export interface InvitationEventView {
  id: string;
  title: string;
  type: EventType | null;
  hostName: string;
  hostEmail: string;
  hostPhone: string | null;
  hostAvatarUrl: string | null;
  startsAt: string;
  endsAt: string | null;
  rsvpDeadline: string | null;
  timezone: string;
  venue: string;
  address: string;
  city: string;
  onlineLink: string | null;
  message: string;
  rules: string;
  dressCode: string;
  coverUrl: string | null;
  templateId: string | null;
  status: EventStatus;
  contributionEnabled: boolean;
  bankDetails: InvitationBankDetails | null;
}

/** Dados do convidado apenas para o token aberto. */
export interface InvitationGuestView {
  name: string;
  email: string;
  emailHasAccount: boolean;
  status: RsvpStatus;
  message: string | null;
}

export interface InvitationView {
  event: InvitationEventView;
  guest: InvitationGuestView;
  deadlinePassed: boolean;
  countdownDays: number;
}

export type InvitationResponseStatus = 'accepted' | 'declined';

export interface InvitationResponseInput {
  status: InvitationResponseStatus;
  /** Texto simples com no máximo 500 caracteres; `null` limpa a mensagem anterior. */
  message: string | null;
}
