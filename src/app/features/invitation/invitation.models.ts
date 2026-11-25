import { EventStatus, EventType, RsvpStatus } from '../../core/models/models';
import { TemplateManifest } from '../../core/models/template-manifest';

/** Bloco 14: organizador visível no convite (responsável primeiro). */
export interface InvitationOrganizer {
  name: string;
  avatarUrl: string | null;
  role: 'owner' | 'manager';
  email: string | null;
  phone: string | null;
}

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
  /** Bloco 14 */
  manifest: TemplateManifest;
  templateSlug: string | null;
  youtubeVideoId: string | null;
  latitude: number | null;
  longitude: number | null;
  placeLabel: string | null;
  organizers: InvitationOrganizer[];
  community: { name: string; slug: string; avatarUrl: string | null; isPublic: boolean } | null;
}

/** Dados do convidado apenas para o token aberto. */
export interface InvitationGuestView {
  name: string;
  email: string;
  emailHasAccount: boolean;
  status: RsvpStatus;
  message: string | null;
  /** Resposta do anfitrião à mensagem deixada pelo convidado. */
  answer: string | null;
  answeredAt: string | null;
  guestKind: 'male' | 'female' | 'couple' | 'family' | null;
  companionName: string | null;
  partySize: number | null;
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
