/**
 * Bloco 15B — catálogo canónico de templates de sistema (T01–T19).
 *
 * Fonte única no front: cada definição traz o manifesto v1, o documento v2
 * de blocos e `previewData` neutra. Nenhuma marca, fotografia de terceiros
 * ou nome real entra nestes exemplos. As paletas são locais ao template
 * (nunca tokens globais da aplicação) e as fontes vêm só do catálogo local.
 *
 * Nota de fidelidade: o PDF do back continua a usar o renderizador genérico
 * de blocos v2. Detalhes puramente decorativos (papel enrolado, relevo 3D
 * das flores, máscaras de gradiente nas fotos) são aproximados no convite
 * digital pelos ornamentos/estilos do manifesto e não são reproduzidos
 * ponto-a-ponto no PDF; o documento de blocos é o contrato comum.
 */
import type { EventTemplate } from '../models/models';
import {
  normalizeManifest,
  type TemplateFont,
  type TemplateManifest,
  type TemplateOrientation,
} from '../models/template-manifest';
import type {
  ActionButton,
  BlockStyle,
  TemplateBlock,
  TimelineItem,
} from '../models/template-document';

/* ------------------------------------------------------------------ */
/* Blocos reutilizáveis (um id único por bloco em todo o catálogo)     */
/* ------------------------------------------------------------------ */

function title(id: string, text: string, style?: BlockStyle): TemplateBlock {
  return { id, type: 'title', text, style };
}
function text(id: string, value: string, style?: BlockStyle): TemplateBlock {
  return { id, type: 'text', text: value, style };
}
function message(id: string, value: string, style?: BlockStyle): TemplateBlock {
  return { id, type: 'message', text: value, style };
}
function datetime(
  id: string,
  options: { showDate?: boolean; showTime?: boolean; style?: BlockStyle } = {},
): TemplateBlock {
  return { id, type: 'datetime', showDate: options.showDate ?? true, showTime: options.showTime ?? true, style: options.style };
}
function location(
  id: string,
  options: { showMap?: boolean; style?: BlockStyle } = {},
): TemplateBlock {
  return { id, type: 'location', showMap: options.showMap ?? true, style: options.style };
}
function countdown(id: string, style?: BlockStyle): TemplateBlock {
  return { id, type: 'countdown', style };
}
function timeline(id: string, items: TimelineItem[], style?: BlockStyle): TemplateBlock {
  return { id, type: 'timeline', items, style };
}
function buttons(id: string, items: ActionButton[], style?: BlockStyle): TemplateBlock {
  return { id, type: 'buttons', buttons: items, style };
}
function qr(
  id: string,
  label: string,
  destination: 'event' | 'invite' | 'custom' = 'invite',
  style?: BlockStyle,
): TemplateBlock {
  return { id, type: 'qr', label, destination, style };
}
function gifts(id: string, value: string, withQr = false, style?: BlockStyle): TemplateBlock {
  return { id, type: 'gifts', text: value, qr: withQr, style };
}
function divider(id: string, variant: 'line' | 'ornament' | 'space' = 'line'): TemplateBlock {
  return { id, type: 'divider', variant };
}
function ornament(id: string, name: string, style?: BlockStyle): TemplateBlock {
  return { id, type: 'ornament', ornament: name, style };
}
/** Sem URL: o renderizador mostra o marcador neutro, sem fotos de terceiros. */
function image(id: string, alt: string, url?: string, style?: BlockStyle): TemplateBlock {
  return { id, type: 'image', alt, url, style };
}
function gallery(id: string, urls: string[] = [], style?: BlockStyle): TemplateBlock {
  return { id, type: 'gallery', urls, style };
}
function musicVideo(id: string, youtubeId?: string, style?: BlockStyle): TemplateBlock {
  return { id, type: 'music_video', youtubeId, style };
}

const TIME_ITEMS: TimelineItem[] = [
  { time: '16:00', label: 'Chegada', icon: 'pin' },
  { time: '16:30', label: 'Cerimónia', icon: 'heart' },
  { time: '18:00', label: 'Cocktail', icon: 'glass' },
  { time: '19:30', label: 'Jantar', icon: 'plate' },
  { time: '22:00', label: 'Fim', icon: 'star' },
];

const caps: BlockStyle = { fontFamily: 'sans', fontWeight: 'bold', letterSpacing: 2.4, fontSize: 10 };
const smallCaps: BlockStyle = { fontFamily: 'cap', letterSpacing: 1.8, fontSize: 11 };
const scriptLarge: BlockStyle = { fontFamily: 'script', fontSize: 38 };
const scriptMedium: BlockStyle = { fontFamily: 'script', fontSize: 26 };
const serifBody: BlockStyle = { fontFamily: 'serif', fontSize: 15 };

/* ------------------------------------------------------------------ */
/* Fábrica de definições                                               */
/* ------------------------------------------------------------------ */

const DEFAULT_FIELDS = [
  'title',
  'host_name',
  'starts_at',
  'timezone',
  'location',
  'message',
  'dress_code',
];

function sampleData(
  slug: string,
  type: string,
  overrides: Record<string, string> = {},
): Record<string, string> {
  return {
    title: 'Ana & João',
    hostName: 'As famílias',
    startsAt: '2026-06-14T16:00:00.000Z',
    city: 'Luanda',
    venue: 'Quinta das Palmeiras',
    message: 'Queridos familiares e amigos, esperamos-vos para celebrar connosco.',
    dressCode: 'Traje elegante',
    templateSlug: slug,
    type,
    ...overrides,
  };
}

interface DefinitionInput {
  slug: string;
  name: string;
  description: string;
  orientation: TemplateOrientation;
  palette: TemplateManifest['palette'];
  fonts: { display: TemplateFont; body: TemplateFont };
  ornaments: TemplateManifest['ornaments'];
  blocks: TemplateBlock[];
  layout?: TemplateManifest['layout'];
  cover?: TemplateManifest['cover'];
  openStyle?: TemplateManifest['open_style'];
  pdf?: Partial<TemplateManifest['pdf']>;
  sample?: Record<string, string>;
  fields?: string[];
}

function define(input: DefinitionInput): EventTemplate {
  const manifest: TemplateManifest = {
    version: 1,
    palette: input.palette,
    fonts: input.fonts,
    ornaments: input.ornaments,
    layout: input.layout ?? {
      align: 'center',
      blocks: ['title', 'host', 'datetime', 'location', 'message'],
    },
    cover: input.cover ?? 'hero',
    open_style: input.openStyle ?? 'fade',
    pdf: {
      frame: 'none',
      qr_position: 'bottom-right',
      show_ornaments: false,
      ...input.pdf,
    },
    document: { version: 2, blocks: input.blocks },
    orientation: input.orientation,
    previewData: input.sample ?? sampleData(input.slug, 'wedding'),
  };
  return {
    id: `system-${input.slug}`,
    slug: input.slug,
    name: input.name,
    description: input.description,
    previewImageUrl: null,
    supportedFields: input.fields ?? DEFAULT_FIELDS,
    themes: [{ mode: 'light', palette: 'default' }],
    manifest: normalizeManifest(manifest),
    kind: 'system',
  };
}

/* ------------------------------------------------------------------ */
/* T01–T08 — tiras digitais                                            */
/* ------------------------------------------------------------------ */

const t01 = define({
  slug: 't01-papel-creme',
  name: 'Papel creme com fio',
  description: 'Tira romântica em papel creme, com fio ondulado, calendário e painel de confirmação.',
  orientation: 'strip',
  palette: { bg: '#F4EFE6', surface: '#FFFDF8', ink: '#4A3B32', accent: '#8B2E2E', muted: '#7A6656' },
  fonts: { display: 'script', body: 'serif' },
  ornaments: { frame: 'none', corners: 'leaf', divider: 'wave' },
  cover: 'hero',
  openStyle: 'fade',
  pdf: { frame: 'single', qr_position: 'bottom-right', show_ornaments: true, qr_label: 'Informação' },
  blocks: [
    ornament('t01-ornament-top', 'leaf'),
    title('t01-title', 'Ana & João', scriptLarge),
    text('t01-kicker', 'Convite de casamento', caps),
    divider('t01-divider-1', 'ornament'),
    image('t01-photo', 'Fotografia do casal com margem creme'),
    text('t01-welcome', 'Queridos familiares e amigos, queremos partilhar convosco este dia.', serifBody),
    text('t01-date-label', 'Sábado, 14 de junho · 16:00', smallCaps),
    datetime('t01-datetime', { showDate: true, showTime: true }),
    timeline('t01-timeline', TIME_ITEMS),
    text('t01-venue-label', 'Onde tudo vai acontecer', smallCaps),
    location('t01-location', { showMap: true }),
    buttons('t01-buttons-map', [
      { action: 'location', label: 'Abrir mapa' },
      { action: 'gifts', label: 'Desejos' },
    ]),
    divider('t01-divider-2', 'ornament'),
    text('t01-dress-label', 'Dress code', smallCaps),
    text('t01-dress', 'Tons creme e vinho, com pequenos laços.', serifBody),
    gifts('t01-gifts', 'O melhor presente é a vossa presença.', false),
    countdown('t01-countdown'),
    message('t01-closing', 'Confirmamos a vossa presença até ao dia do evento.', serifBody),
    buttons('t01-buttons-rsvp', [{ action: 'rsvp', label: 'Enviar' }]),
    ornament('t01-ornament-bottom', 'leaf'),
  ],
});

const t02 = define({
  slug: 't02-envelope-terracota',
  name: 'Envelope terracota',
  description: 'Tira boho em terracota e creme, com monograma, leitor de música e contagem decrescente.',
  orientation: 'strip',
  palette: { bg: '#785644', surface: '#FAF6F0', ink: '#FAF6F0', accent: '#FAF6F0', muted: '#E4D6C8' },
  fonts: { display: 'script', body: 'serif' },
  ornaments: { frame: 'thin', corners: 'leaf', divider: 'ornament' },
  cover: 'framed',
  openStyle: 'envelope',
  pdf: { frame: 'double', qr_position: 'bottom-center', show_ornaments: true },
  blocks: [
    text('t02-envelope', 'Ana  |  João', smallCaps),
    title('t02-title', 'Ana & João', { ...scriptLarge, color: '#FFFFFF' }),
    text('t02-date', 'Sábado, 14 de junho · 16:00', { ...caps, color: '#FFFFFF' }),
    ornament('t02-branches', 'leaf'),
    message('t02-announcement', 'Casamo-nos! Juntamos as nossas vidas num novo capítulo.', serifBody),
    divider('t02-divider-1', 'ornament'),
    image('t02-photo', 'Fotografia dos noivos com legenda'),
    musicVideo('t02-music'),
    text('t02-blessing', 'Que a nossa alegria seja também a vossa.', { ...serifBody, fontStyle: 'italic' }),
    countdown('t02-countdown'),
    text('t02-calendar', '14 · junho · 2026', smallCaps),
    gallery('t02-gallery'),
    location('t02-location', { showMap: true }),
    buttons('t02-buttons-location', [{ action: 'location', label: 'Ver localização' }]),
    text('t02-dress', 'Código de vestimenta: traje casual elegante.', serifBody),
    gifts('t02-gifts', 'Sugestão de presente: envelope ou transferência.', true),
    qr('t02-qr', 'Dados para presentes', 'custom'),
    buttons('t02-buttons-rsvp', [{ action: 'rsvp', label: 'Confirmar presença' }]),
    text('t02-kids', 'Sem crianças, com todo o carinho.', serifBody),
    ornament('t02-final', 'leaf'),
  ],
});

const t03 = define({
  slug: 't03-hacienda-marfim',
  name: 'Hacienda marfim',
  description: 'Cartão minimalista elegante em marfim e areia, com monograma, cronograma e QR de presentes.',
  orientation: 'card45',
  palette: { bg: '#F7F3EA', surface: '#E7DDCB', ink: '#3A322B', accent: '#8A7761', muted: '#6F6152' },
  fonts: { display: 'serif', body: 'sans' },
  ornaments: { frame: 'thin', corners: 'arch', divider: 'line' },
  cover: 'framed',
  openStyle: 'curtain',
  pdf: { frame: 'double', qr_position: 'bottom-center', show_ornaments: true, qr_label: 'Presentes' },
  blocks: [
    ornament('t03-ornament-top', 'arch'),
    text('t03-monogram', 'A  |  J', smallCaps),
    title('t03-title', 'Ana & João', { fontFamily: 'serif', fontSize: 30 }),
    text('t03-title-caps', 'Nos casamos', { ...smallCaps, color: '#2F2A26' }),
    divider('t03-divider-1', 'line'),
    image('t03-photo', 'Fotografia com bordo inferior rasgado'),
    text('t03-short', 'Uma celebração simples e cheia de afeto.', serifBody),
    musicVideo('t03-music'),
    text('t03-ceremony', 'Cerimónia · 16:00', smallCaps),
    datetime('t03-datetime', { showDate: true, showTime: true }),
    location('t03-location', { showMap: true }),
    text('t03-reception', 'Receção · 18:30', smallCaps),
    timeline('t03-timeline', TIME_ITEMS),
    text('t03-dress', 'Dress code: três tons — marfim, areia e castanho.', serifBody),
    qr('t03-qr', 'O nosso melhor presente', 'custom'),
    gifts('t03-gifts', 'Presentes opcionais; a vossa companhia basta.', true),
    buttons('t03-buttons', [
      { action: 'rsvp', label: 'Confirmar assistência' },
      { action: 'location', label: 'Ver localização' },
    ]),
    text('t03-recommendations', 'Recomendações: carro, calçado confortável e câmara.', serifBody),
    ornament('t03-ornament-bottom', 'arch'),
  ],
});

const t04 = define({
  slug: 't04-marfim-folhas',
  name: 'Marfim com folhas',
  description: 'Variante delicada do cartão marfim, com ramo de folhas, bordo rasgado e QR sobre faixa bege.',
  orientation: 'card45',
  palette: { bg: '#F5F1EA', surface: '#D9CBB6', ink: '#332F2A', accent: '#8D7F70', muted: '#6F6459' },
  fonts: { display: 'serif', body: 'serif' },
  ornaments: { frame: 'none', corners: 'leaf', divider: 'leaf' },
  cover: 'framed',
  openStyle: 'envelope',
  pdf: { frame: 'single', qr_position: 'bottom-center', show_ornaments: true },
  blocks: [
    ornament('t04-monogram-leaves', 'leaf'),
    text('t04-monogram', 'A  |  J', smallCaps),
    title('t04-title', 'Ana & João', { fontFamily: 'serif', fontSize: 29 }),
    divider('t04-divider-1', 'ornament'),
    image('t04-photo', 'Fotografia com bordo rasgado branco'),
    datetime('t04-datetime', { showDate: true, showTime: true }),
    text('t04-ceremony', 'Cerimónia · 16:00', serifBody),
    text('t04-reception', 'Receção · 18:30', serifBody),
    timeline('t04-timeline', TIME_ITEMS),
    qr('t04-qr', 'Presentes', 'custom'),
    location('t04-location', { showMap: true }),
    buttons('t04-buttons-location', [{ action: 'location', label: 'Ver localização' }]),
    text('t04-recommendations', 'Carro · calçado confortável · câmara', serifBody),
    ornament('t04-final-leaves', 'leaf'),
  ],
});

const t05 = define({
  slug: 't05-foto-desvanece',
  name: 'Fotografia que desvanece',
  description: 'Tira moderna em branco, com foto que dissolve no fundo, nomes em script e quatro botões em pílula.',
  orientation: 'strip',
  palette: { bg: '#FFFFFF', surface: '#F7F7F5', ink: '#2B2B2B', accent: '#2B2B2B', muted: '#6B7280' },
  fonts: { display: 'script', body: 'serif' },
  ornaments: { frame: 'none', corners: 'gradient-rings', divider: 'line' },
  cover: 'hero',
  openStyle: 'fade',
  pdf: { frame: 'none', qr_position: 'bottom-right', show_ornaments: false },
  blocks: [
    image('t05-photo', 'Fotografia que desvanece em branco'),
    text('t05-quote', 'O amor é a única coisa que se multiplica quando se partilha.', {
      fontFamily: 'serif',
      fontStyle: 'italic',
      align: 'center',
    }),
    title('t05-name-1', 'Ana', { ...scriptLarge, align: 'right' }),
    title('t05-name-2', 'e João', { ...scriptLarge, align: 'left' }),
    text('t05-invite', 'Convidam para a cerimónia do seu casamento', { ...caps, align: 'center' }),
    datetime('t05-datetime', { showDate: true, showTime: true, style: { ...caps, align: 'center' } }),
    location('t05-location', { showMap: true }),
    text('t05-click', 'Clique nos botões:', { ...serifBody, align: 'center' }),
    buttons('t05-buttons', [
      { action: 'location', label: 'Localização' },
      { action: 'gifts', label: 'Lista de presentes' },
      { action: 'rsvp', label: 'Confirmar presença' },
      { action: 'site', label: 'O nosso site' },
    ]),
    ornament('t05-ornament', 'leaf'),
  ],
});

const t06 = define({
  slug: 't06-bordo-envelope',
  name: 'Bordô com envelope',
  description: 'Tira clássica bordô e rosa seco, com aba de envelope, leitor de música e itinerário alternado.',
  orientation: 'strip',
  palette: { bg: '#5B2030', surface: '#F3EEE8', ink: '#F3EEE8', accent: '#8A4A57', muted: '#D8C3C8' },
  fonts: { display: 'script', body: 'serif' },
  ornaments: { frame: 'thin-gold', corners: 'leaf', divider: 'ornament' },
  cover: 'framed',
  openStyle: 'envelope',
  pdf: { frame: 'double', qr_position: 'bottom-center', show_ornaments: true },
  blocks: [
    text('t06-envelope', 'M  |  M', smallCaps),
    title('t06-title', 'Ana & João', { ...scriptLarge, color: '#FFFFFF' }),
    text('t06-date', 'Sábado, 06 de dezembro · 16:00', { ...caps, color: '#FFFFFF' }),
    ornament('t06-floral-1', 'leaf'),
    text('t06-quote', 'O senhor é o meu pastor; nada me faltará.', { ...serifBody, fontStyle: 'italic' }),
    text('t06-monogram', 'A  |  J', smallCaps),
    text('t06-married', 'Nos casamos!', { ...scriptMedium, color: '#FFFFFF' }),
    image('t06-photo', 'Fotografia retangular do casal'),
    ornament('t06-floral-2', 'leaf'),
    musicVideo('t06-music'),
    text('t06-parents', 'As famílias unem as suas vidas no sacramento do matrimónio.', serifBody),
    countdown('t06-countdown'),
    text('t06-big-date', 'Sábado · 06 · dezembro', { ...smallCaps, fontSize: 16 }),
    gallery('t06-gallery'),
    location('t06-location', { showMap: true }),
    buttons('t06-buttons-location', [{ action: 'location', label: 'Ver localização' }]),
    timeline('t06-timeline', TIME_ITEMS),
    text('t06-dress', 'Código de vestimenta: evitar preto e branco.', serifBody),
    gifts('t06-gifts', 'Sugestão de presentes e alojamento.', true),
    buttons('t06-buttons-rsvp', [{ action: 'rsvp', label: 'Confirmar assistência' }]),
    image('t06-photo-final', 'Fotografia final'),
  ],
});

const t07 = define({
  slug: 't07-preto-branco-rasgado',
  name: 'Preto e branco, papel rasgado',
  description: 'Tira urbana a preto e branco, com bordas rasgadas, contagem decrescente e botões pretos.',
  orientation: 'strip',
  palette: { bg: '#FBFAF7', surface: '#FFFFFF', ink: '#111111', accent: '#111111', muted: '#5C5C5C' },
  fonts: { display: 'sans', body: 'serif' },
  ornaments: { frame: 'none', corners: 'none', divider: 'ornament' },
  cover: 'hero',
  openStyle: 'fade',
  pdf: { frame: 'none', qr_position: 'bottom-right', show_ornaments: false },
  blocks: [
    image('t07-cover', 'Fotografia de capa a preto e branco'),
    title('t07-title', 'Nos casamos', { ...caps, color: '#FFFFFF' }),
    text('t07-missing', 'Faltam:', caps),
    countdown('t07-countdown'),
    text('t07-wait', 'Esperamos-vos para celebrar', smallCaps),
    datetime('t07-datetime', { showDate: true, showTime: true }),
    divider('t07-divider-1', 'ornament'),
    location('t07-location', { showMap: true }),
    buttons('t07-buttons', [
      { action: 'location', label: 'Como chegar' },
      { action: 'rsvp', label: 'Confirmar' },
    ]),
    timeline('t07-timeline', TIME_ITEMS),
    image('t07-photo', 'Segunda fotografia com bordo rasgado'),
    text('t07-social', 'Partilhe com a hashtag do evento.', serifBody),
    buttons('t07-buttons-social', [{ action: 'share', label: '@o-nosso-dia' }]),
    musicVideo('t07-playlist'),
  ],
});

const t08 = define({
  slug: 't08-salvia-eucalipto',
  name: 'Sálvia e eucalipto',
  description: 'Tira de jardim em sálvia e creme, com ramos de eucalipto, aguarela e itinerário de atividades.',
  orientation: 'strip',
  palette: { bg: '#F7F2E8', surface: '#CFD8C4', ink: '#3E4A2F', accent: '#8C9A7A', muted: '#5E6B4A' },
  fonts: { display: 'script', body: 'cap' },
  ornaments: { frame: 'none', corners: 'leaf', divider: 'leaf' },
  sample: sampleData('t08-salvia-eucalipto', 'wedding', { title: 'Rafaela & Josué' }),
  cover: 'hero',
  openStyle: 'envelope',
  pdf: { frame: 'single', qr_position: 'bottom-center', show_ornaments: true },
  blocks: [
    ornament('t08-eucalyptus-top', 'leaf'),
    title('t08-title', 'Rafaela & Josué', { ...scriptLarge, fontSize: 34 }),
    text('t08-label', 'O nosso casamento', smallCaps),
    text('t08-quote', 'Tudo o que temos é graça; tudo o que damos é amor.', {
      fontFamily: 'serif',
      fontStyle: 'italic',
    }),
    image('t08-photo', 'Fotografia com bordo inferior rasgado'),
    text('t08-parents', 'Pais do noivo · pais da noiva', { ...smallCaps, fontSize: 10 }),
    datetime('t08-datetime', { showDate: true, showTime: true, style: smallCaps }),
    location('t08-location', { showMap: true }),
    buttons('t08-buttons-location', [{ action: 'location', label: 'Ver localização' }]),
    divider('t08-watercolor', 'ornament'),
    text('t08-itinerary', 'Itinerário de atividades', smallCaps),
    timeline('t08-timeline', TIME_ITEMS),
    text('t08-seats', 'Lugares reservados para a família.', serifBody),
    gifts('t08-gifts', 'Sugestão de presente: envelopes.', true),
    buttons('t08-buttons-rsvp', [{ action: 'rsvp', label: 'Enviar mensagem' }]),
    text('t08-adults', 'Só adultos, com aviso gentil.', serifBody),
    ornament('t08-eucalyptus-bottom', 'leaf'),
    image('t08-photo-final', 'Fotografia final com bordo rasgado'),
  ],
});

/* ------------------------------------------------------------------ */
/* T09–T14 — cartões card45/a5                                         */
/* ------------------------------------------------------------------ */

const t09 = define({
  slug: 't09-arco-bordo-dourado',
  name: 'Arco bordô e dourado',
  description: 'Cartão com arco dourado sobre bordô, nomes em script e faixa bordô para a cerimónia.',
  orientation: 'card45',
  palette: { bg: '#7A1230', surface: '#F7F3F1', ink: '#F7F3F1', accent: '#C9A55B', muted: '#E7D4D9' },
  fonts: { display: 'script', body: 'sans' },
  ornaments: { frame: 'thin-gold', corners: 'arch', divider: 'ornament' },
  cover: 'framed',
  openStyle: 'envelope',
  pdf: { frame: 'double', qr_position: 'bottom-center', show_ornaments: true },
  blocks: [
    ornament('t09-arch', 'arch'),
    text('t09-families', 'Juntamente com as suas famílias', { ...smallCaps, color: '#FFFFFF' }),
    title('t09-title', 'Ana & João', { ...scriptLarge, color: '#C9A55B' }),
    divider('t09-divider-1', 'ornament'),
    text('t09-request', 'Pedem a sua presença na cerimónia de casamento', { ...serifBody, color: '#FFFFFF' }),
    text('t09-band', 'Celebração de casamento', { ...caps, color: '#C9A55B' }),
    text('t09-day', '14', { fontFamily: 'serif', fontSize: 36, color: '#FFFFFF' }),
    datetime('t09-datetime', { showDate: true, showTime: true, style: { color: '#FFFFFF' } }),
    location('t09-location', { showMap: true }),
    buttons('t09-buttons', [{ action: 'rsvp', label: 'RSVP' }]),
    text('t09-contacts', 'Confirmação: 923 000 000 · 924 000 000', { ...serifBody, color: '#FFFFFF' }),
  ],
});

const t10 = define({
  slug: 't10-forma-organica-verde',
  name: 'Forma orgânica verde e dourado',
  description: 'Cartão verde-floresta com forma orgânica creme, fio dourado e selo de cera.',
  orientation: 'card45',
  palette: { bg: '#2F3A2A', surface: '#EFE7DA', ink: '#EFE7DA', accent: '#B8975A', muted: '#C8CBB4' },
  fonts: { display: 'cap', body: 'serif' },
  ornaments: { frame: 'none', corners: 'organic', divider: 'ornament' },
  cover: 'framed',
  openStyle: 'fade',
  pdf: { frame: 'single', qr_position: 'bottom-center', show_ornaments: true },
  blocks: [
    text('t10-verse', 'O amor é paciente, o amor é bondoso.', { ...serifBody, fontStyle: 'italic' }),
    text('t10-families', 'Juntamente com as suas famílias', smallCaps),
    title('t10-name-1', 'ANA', { fontFamily: 'cap', fontSize: 32, letterSpacing: 2 }),
    text('t10-amp', '&', { fontFamily: 'script', fontSize: 28, color: '#B8975A' }),
    title('t10-name-2', 'JOÃO', { fontFamily: 'cap', fontSize: 32, letterSpacing: 2 }),
    text('t10-honour', 'Solicitam a honra da sua presença', smallCaps),
    datetime('t10-datetime', { showDate: true, showTime: true, style: smallCaps }),
    location('t10-location', { showMap: true }),
    divider('t10-divider-1', 'ornament'),
    text('t10-blessing', 'Com a bênção das nossas famílias.', { fontFamily: 'script', fontSize: 20 }),
    ornament('t10-seal', 'organic'),
  ],
});

const t11 = define({
  slug: 't11-preto-dourado',
  name: 'Preto e dourado, canto enrolado',
  description: 'Convite de gala preto e dourado, com cantos enrolados, laço de fita e moldura fina.',
  orientation: 'card45',
  palette: { bg: '#121212', surface: '#1C1A17', ink: '#D4AF6A', accent: '#B8903E', muted: '#C6A970' },
  fonts: { display: 'script', body: 'serif' },
  ornaments: { frame: 'thin-gold', corners: 'gold-corners', divider: 'ornament' },
  cover: 'framed',
  openStyle: 'curtain',
  pdf: { frame: 'double', qr_position: 'bottom-center', show_ornaments: true },
  blocks: [
    ornament('t11-corners', 'gold-corners'),
    text('t11-family', 'A família de...', { fontFamily: 'script', fontSize: 22, color: '#D4AF6A' }),
    text('t11-host', 'Ana', { ...smallCaps, color: '#D4AF6A' }),
    divider('t11-divider-1', 'ornament'),
    text('t11-invites', 'Convida para', { fontFamily: 'serif', fontSize: 15, color: '#D4AF6A' }),
    title('t11-title', 'Celebrar', { fontFamily: 'script', fontSize: 42, color: '#D4AF6A' }),
    text('t11-children', 'dos seus filhos', { fontFamily: 'serif', fontSize: 13, color: '#D4AF6A' }),
    text('t11-names', 'ANA  |  JOÃO', { fontFamily: 'cap', fontSize: 20, color: '#D4AF6A', letterSpacing: 1.5 }),
    divider('t11-divider-2', 'ornament'),
    datetime('t11-datetime', { showDate: true, showTime: true }),
    location('t11-location', { showMap: true }),
    text('t11-details', 'Cerimónia e jantar, com música até tarde.', { fontFamily: 'serif', fontSize: 14 }),
  ],
});

const t12 = define({
  slug: 't12-papel-recortado-rosa',
  name: 'Papel recortado rosa e pérola',
  description: 'Cartão pérola com relevo de papel recortado em camadas, texto alinhado à direita e RSVP.',
  orientation: 'card45',
  palette: { bg: '#F6F1EE', surface: '#C9A596', ink: '#4A2F24', accent: '#C9A596', muted: '#553529' },
  fonts: { display: 'script', body: 'sans' },
  ornaments: { frame: 'none', corners: 'organic', divider: 'ornament' },
  cover: 'framed',
  openStyle: 'fade',
  pdf: { frame: 'single', qr_position: 'bottom-center', show_ornaments: true },
  blocks: [
    ornament('t12-paper-flowers', 'organic'),
    text('t12-families', 'As famílias convidam para o matrimónio dos seus filhos', {
      fontFamily: 'sans',
      fontSize: 11,
      align: 'right',
    }),
    title('t12-title', 'Ana & João', { ...scriptLarge, fontSize: 34 }),
    text('t12-month', 'ABRIL', { ...smallCaps, fontSize: 16, align: 'right' }),
    text('t12-day', '14', { fontFamily: 'sans', fontWeight: 'bold', fontSize: 44, align: 'right' }),
    datetime('t12-datetime', { showDate: false, showTime: true, style: { align: 'right' } }),
    location('t12-location', { showMap: true, style: { align: 'right' } }),
    divider('t12-divider-1', 'ornament'),
    text('t12-rsvp', 'RSVP: 923 000 000 · 924 000 000', { fontFamily: 'sans', fontSize: 11, align: 'right' }),
  ],
});

const t13 = define({
  slug: 't13-gradiente-verde-azul',
  name: 'Gradiente verde-azul gravado',
  description: 'Cartão A5 com gradiente verde-floresta a azul-marinho, círculos gravados e data empilhada.',
  orientation: 'a5',
  palette: { bg: '#1E3A2B', surface: '#0C1B33', ink: '#EFE6D6', accent: '#7FA08A', muted: '#B9C3B6' },
  fonts: { display: 'cap', body: 'sans' },
  ornaments: { frame: 'none', corners: 'gradient-rings', divider: 'line' },
  cover: 'framed',
  openStyle: 'fade',
  pdf: { frame: 'single', qr_position: 'bottom-right', show_ornaments: false },
  blocks: [
    text('t13-invite', 'Têm a alegria de vos convidar para o seu casamento', {
      fontFamily: 'sans',
      fontSize: 10,
      letterSpacing: 2,
      color: '#B9C3B6',
    }),
    divider('t13-divider-1', 'line'),
    title('t13-name-1', 'ANA', { fontFamily: 'cap', fontSize: 34, letterSpacing: 2 }),
    text('t13-amp', '&', { fontFamily: 'script', fontSize: 28, color: '#7FA08A' }),
    title('t13-name-2', 'JOÃO', { fontFamily: 'cap', fontSize: 34, letterSpacing: 2 }),
    divider('t13-divider-2', 'line'),
    text('t13-stack', '14\nJUNHO\n2026', { fontFamily: 'sans', fontSize: 20, color: '#7FA08A' }),
    datetime('t13-datetime', { showDate: true, showTime: true, style: { color: '#B9C3B6', fontSize: 12 } }),
    location('t13-location', { showMap: true, style: { color: '#7FA08A' } }),
    text('t13-schedule', 'Cerimónia, jantar e festa até ao fim da noite.', {
      fontFamily: 'sans',
      fontSize: 12,
      color: '#B9C3B6',
    }),
  ],
});

const t14 = define({
  slug: 't14-cartao-creme-dourado',
  name: 'Cartão creme dourado',
  description: 'Cartão tipográfico creme e dourado, com nomes em serif-caps e dados bancários editáveis.',
  orientation: 'a5',
  palette: { bg: '#F3EBDF', surface: '#FFFFFF', ink: '#1A1A1A', accent: '#A9741E', muted: '#6B5B48' },
  fonts: { display: 'cap', body: 'serif' },
  ornaments: { frame: 'thin-gold', corners: 'gold-corners', divider: 'line' },
  cover: 'framed',
  openStyle: 'envelope',
  pdf: { frame: 'double', qr_position: 'bottom-center', show_ornaments: true },
  blocks: [
    title('t14-name-1', 'ANA', { fontFamily: 'cap', fontSize: 36, color: '#A9741E', letterSpacing: 2 }),
    title('t14-name-2', 'e JOÃO', { fontFamily: 'cap', fontSize: 36, color: '#A9741E', letterSpacing: 2 }),
    text('t14-subtitle', 'Some things are meant to be.', { fontFamily: 'serif', fontStyle: 'italic' }),
    divider('t14-divider-1', 'line'),
    text('t14-invite', 'Convidamo-vos a celebrar o nosso casamento', smallCaps),
    datetime('t14-datetime', { showDate: true, showTime: true, style: { color: '#A9741E', fontSize: 18 } }),
    location('t14-location', { showMap: true }),
    text('t14-gift-details', 'Presentes: Banco exemplo · Titular Ana · Referência 000 000', serifBody),
    gifts('t14-gifts', 'Dados bancários editáveis.', true),
    divider('t14-divider-2', 'line'),
    text('t14-confirm', 'Confirmar assistência em www.exemplo.ao', serifBody),
    buttons('t14-buttons', [{ action: 'rsvp', label: 'Confirmar' }]),
  ],
});

/* ------------------------------------------------------------------ */
/* T15–T19 — digital moderno, empresa e conferência                    */
/* ------------------------------------------------------------------ */

const t15 = define({
  slug: 't15-digital-premium',
  name: 'Convite digital premium',
  description: 'Convite digital minimalista a preto e branco, com nomes empilhados e quatro botões 3D.',
  orientation: 'strip',
  palette: { bg: '#F7F6F2', surface: '#FFFFFF', ink: '#111111', accent: '#4A4A4A', muted: '#5F5F5F' },
  fonts: { display: 'cap', body: 'serif' },
  ornaments: { frame: 'none', corners: 'gradient-rings', divider: 'line' },
  cover: 'hero',
  openStyle: 'fade',
  pdf: { frame: 'none', qr_position: 'bottom-right', show_ornaments: false },
  blocks: [
    image('t15-photo', 'Fotografia a preto e branco que dissolve em papel'),
    text('t15-monogram', 'A · J', { fontFamily: 'script', fontSize: 20 }),
    title('t15-name-1', 'ANA', { fontFamily: 'cap', fontSize: 32, letterSpacing: 2 }),
    text('t15-amp', '&', { fontFamily: 'script', fontSize: 24 }),
    title('t15-name-2', 'JOÃO', { fontFamily: 'cap', fontSize: 32, letterSpacing: 2 }),
    text('t15-quote', 'Juntos, um capítulo novo.', { fontFamily: 'serif', fontStyle: 'italic' }),
    text('t15-date-stack', '14\n06\n26', { fontFamily: 'serif', fontSize: 28 }),
    datetime('t15-datetime', { showDate: false, showTime: true }),
    location('t15-location', { showMap: true }),
    text('t15-dress', 'Traje: esporte fino.', serifBody),
    ornament('t15-branch', 'leaf'),
    buttons('t15-buttons', [
      { action: 'location', label: 'Local da cerimónia' },
      { action: 'location', label: 'Local da receção' },
      { action: 'site', label: 'Site dos noivos' },
      { action: 'rsvp', label: 'Confirmar presença' },
    ]),
    text('t15-click', 'Clique nos ícones abaixo.', serifBody),
  ],
});

const t16 = define({
  slug: 't16-envelope-corporativo',
  name: 'Envelope corporativo',
  description: 'Convite de gala corporativa com envelope azul-marinho, moldura em gradiente e barra de data.',
  orientation: 'card45',
  palette: { bg: '#0B3A63', surface: '#FFFFFF', ink: '#F2F6FA', accent: '#F2C14E', muted: '#D9E5EE' },
  fonts: { display: 'serif', body: 'sans' },
  ornaments: { frame: 'thin', corners: 'gold-corners', divider: 'ornament' },
  cover: 'framed',
  openStyle: 'envelope',
  pdf: { frame: 'single', qr_position: 'bottom-right', show_ornaments: true },
  sample: sampleData('t16-envelope-corporativo', 'corporate', {
    title: 'A sua empresa',
    hostName: 'A equipa',
    message: 'Convidamo-vos para a celebração do nosso aniversário.',
    dressCode: 'Traje de gala',
    venue: 'Salão Principal',
  }),
  fields: ['title', 'starts_at', 'timezone', 'location', 'message'],
  blocks: [
    text('t16-logo', 'A sua logo', smallCaps),
    text('t16-save-date', 'Guarde a data', { fontFamily: 'script', fontSize: 22, color: '#FFFFFF' }),
    title('t16-title', 'Convite', { fontFamily: 'serif', fontSize: 42, color: '#FFFFFF' }),
    message('t16-message', 'Celebremos juntos os anos que nos trouxeram até aqui.', {
      fontFamily: 'sans',
      fontSize: 14,
      color: '#FFFFFF',
    }),
    datetime('t16-datetime', { showDate: true, showTime: true }),
    location('t16-location', { showMap: true }),
    text('t16-program', 'Programa: receção, jantar e música ao vivo.', {
      fontFamily: 'sans',
      fontSize: 13,
      color: '#FFFFFF',
    }),
    divider('t16-divider-1', 'ornament'),
    text('t16-bar', 'SÁBADO · 08 · 13:00', { ...caps, color: '#F2C14E' }),
  ],
});

const t17 = define({
  slug: 't17-confraternizacao-dourada',
  name: 'Confraternização dourada',
  description: 'Story vertical de confraternização, com fitas douradas, balões e título condensado em duas linhas.',
  orientation: 'story',
  palette: { bg: '#F6F0E6', surface: '#FFFBF2', ink: '#7A4B2A', accent: '#C79A52', muted: '#6B4A32' },
  fonts: { display: 'condensed', body: 'sans' },
  ornaments: { frame: 'none', corners: 'ribbons', divider: 'ornament' },
  cover: 'hero',
  openStyle: 'fade',
  pdf: { frame: 'none', qr_position: 'bottom-right', show_ornaments: true },
  sample: sampleData('t17-confraternizacao-dourada', 'corporate', {
    title: 'Confraternização',
    hostName: 'A equipa',
    message: 'Agradecemos a dedicação de cada pessoa que fez deste ano um sucesso.',
    venue: 'Salão de festas',
    dressCode: 'Traje elegante',
  }),
  fields: ['title', 'starts_at', 'timezone', 'location', 'message'],
  blocks: [
    ornament('t17-balloons', 'ribbons'),
    title('t17-title-1', 'CONFRA', { fontFamily: 'condensed', fontSize: 40, letterSpacing: 1 }),
    title('t17-title-2', 'TERNIZAÇÃO', { fontFamily: 'condensed', fontSize: 40, letterSpacing: 1 }),
    text('t17-script', 'Convite', { fontFamily: 'script', fontSize: 26, color: '#C79A52' }),
    message('t17-thanks', 'Agradecemos a dedicação de cada pessoa que fez deste ano um sucesso.', {
      fontFamily: 'sans',
      fontSize: 14,
    }),
    divider('t17-pill', 'ornament'),
    datetime('t17-datetime', { showDate: true, showTime: true, style: { fontFamily: 'sans', fontSize: 13 } }),
    location('t17-location', { showMap: true, style: { fontFamily: 'sans', fontSize: 13 } }),
    text('t17-invite', 'Esperamos-vos para celebrar em conjunto.', { fontFamily: 'script', fontSize: 22, color: '#C79A52' }),
    buttons('t17-buttons', [
      { action: 'rsvp', label: 'Confirmar presença' },
      { action: 'site', label: 'Site' },
    ]),
    text('t17-footer', 'A sua logo · @empresa · www.exemplo.ao', {
      fontFamily: 'sans',
      fontSize: 10,
      letterSpacing: 1,
    }),
  ],
});

const t18 = define({
  slug: 't18-gala-ouro-carvao',
  name: 'Gala ouro e carvão',
  description: 'Convite A4 de gala, com moldura dourada dupla, faixas diagonais e taça de champanhe em traço.',
  orientation: 'a4',
  palette: { bg: '#FAFAFA', surface: '#FFFFFF', ink: '#333333', accent: '#C9A04D', muted: '#8C6A2D' },
  fonts: { display: 'cap', body: 'serif' },
  ornaments: { frame: 'double', corners: 'gold-corners', divider: 'ornament' },
  cover: 'framed',
  openStyle: 'curtain',
  pdf: { frame: 'double', qr_position: 'bottom-center', show_ornaments: true },
  sample: sampleData('t18-gala-ouro-carvao', 'corporate', {
    title: 'A sua empresa',
    hostName: 'A direção',
    message: 'Tem o prazer de vos convidar para a sua gala anual.',
    venue: 'Salão Nobre',
  }),
  fields: ['title', 'starts_at', 'timezone', 'location', 'message'],
  blocks: [
    ornament('t18-glass', 'gold-corners'),
    title('t18-script', 'confraternização', { fontFamily: 'script', fontSize: 34, color: '#333333' }),
    title('t18-company', 'A SUA EMPRESA', { fontFamily: 'cap', fontSize: 26, color: '#C9A04D' }),
    divider('t18-divider-1', 'ornament'),
    message('t18-message', 'Tem o prazer de vos convidar para a sua gala anual.', serifBody),
    text('t18-day', 'SÁBADO', smallCaps),
    datetime('t18-datetime', { showDate: true, showTime: true, style: { color: '#C9A04D', fontSize: 20 } }),
    text('t18-hours', 'ÀS 20H00', smallCaps),
    location('t18-location', { showMap: true }),
    text('t18-closing', 'Contamos com a sua presença!', { ...serifBody, fontStyle: 'italic' }),
  ],
});

const t19 = define({
  slug: 't19-conferencia-tecnologica',
  name: 'Conferência tecnológica',
  description: 'Convite horizontal azul-marinho para conferências e workshops, com cubos isométricos e oradores.',
  orientation: 'landscape',
  palette: { bg: '#0A1F5C', surface: '#12307F', ink: '#FFFFFF', accent: '#7FA0FF', muted: '#D7E0FF' },
  fonts: { display: 'anton', body: 'sans' },
  ornaments: { frame: 'none', corners: 'geo-dark', divider: 'line' },
  cover: 'none',
  openStyle: 'fade',
  pdf: { frame: 'none', qr_position: 'bottom-right', show_ornaments: false },
  sample: sampleData('t19-conferencia-tecnologica', 'other', {
    title: 'Conference',
    hostName: 'A equipa de tecnologia',
    message: 'Três oradores, uma tarde de ideias e práticas para levar à equipa.',
    venue: 'Auditório Principal',
    dressCode: 'Traje casual',
  }),
  fields: ['title', 'starts_at', 'timezone', 'location', 'message'],
  blocks: [
    text('t19-logo', 'A sua logo', { fontFamily: 'sans', fontSize: 10, letterSpacing: 2 }),
    text('t19-subtitle', 'TECHNOLOGY', { fontFamily: 'sans', fontSize: 11, letterSpacing: 4 }),
    title('t19-title', 'CONFERENCE', { fontFamily: 'anton', fontSize: 44, letterSpacing: 1 }),
    text('t19-speakers', 'Orador A · Oradora B · Orador C', { fontFamily: 'sans', fontSize: 13 }),
    divider('t19-divider-1', 'line'),
    text('t19-info', 'Visitantes · Datas · Local', { fontFamily: 'sans', fontSize: 12, letterSpacing: 1 }),
    datetime('t19-datetime', { showDate: true, showTime: true }),
    location('t19-location', { showMap: true }),
    buttons('t19-buttons', [{ action: 'site', label: 'Mais informação em www.exemplo.ao' }]),
    ornament('t19-cubes', 'geo-dark'),
  ],
});

/**
 * Ordem de entrega do Bloco 15B: os sete estilos principais primeiro,
 * depois os restantes por número. O repositório junta esta lista ao
 * catálogo remoto e deduplica por slug (esta lista ganha).
 */
export const SYSTEM_TEMPLATES: EventTemplate[] = [
  t01,
  t03,
  t05,
  t08,
  t11,
  t13,
  t17,
  t02,
  t04,
  t06,
  t07,
  t09,
  t10,
  t12,
  t14,
  t15,
  t16,
  t18,
  t19,
];
