import { TemplateFont } from './template-manifest';

export type TemplateBlockType =
  | 'text'
  | 'title'
  | 'datetime'
  | 'location'
  | 'countdown'
  | 'timeline'
  | 'dress_code'
  | 'gifts'
  | 'image'
  | 'gallery'
  | 'music_video'
  | 'qr'
  | 'buttons'
  | 'message'
  | 'divider'
  | 'ornament';

export interface BlockStyle {
  fontFamily?: TemplateFont;
  fontWeight?: 'normal' | 'bold';
  fontStyle?: 'normal' | 'italic';
  fontSize?: number;
  color?: string;
  letterSpacing?: number;
  align?: 'left' | 'center' | 'right';
}

export interface TemplateBlockBase {
  id: string;
  type: TemplateBlockType;
  visible?: boolean;
  style?: BlockStyle;
}

export interface TextBlock extends TemplateBlockBase {
  type: 'text' | 'title' | 'message' | 'dress_code';
  text: string;
  label?: string;
}

export interface DateTimeBlock extends TemplateBlockBase {
  type: 'datetime';
  showTime?: boolean;
  showDate?: boolean;
}

export interface LocationBlock extends TemplateBlockBase {
  type: 'location';
  showMap?: boolean;
}

export interface CountdownBlock extends TemplateBlockBase {
  type: 'countdown';
}

export interface TimelineItem {
  time?: string;
  label: string;
  icon?: string;
}

export interface TimelineBlock extends TemplateBlockBase {
  type: 'timeline';
  items: TimelineItem[];
}

export interface GiftsBlock extends TemplateBlockBase {
  type: 'gifts';
  text?: string;
  qr?: boolean;
}

export interface ImageBlock extends TemplateBlockBase {
  type: 'image';
  url?: string;
  alt?: string;
}

export interface GalleryBlock extends TemplateBlockBase {
  type: 'gallery';
  urls: string[];
}

export interface MusicVideoBlock extends TemplateBlockBase {
  type: 'music_video';
  youtubeId?: string;
  audioUrl?: string;
}

export interface QrBlock extends TemplateBlockBase {
  type: 'qr';
  label?: string;
  destination?: 'event' | 'invite' | 'custom';
  customUrl?: string;
}

export type ButtonAction = 'rsvp' | 'location' | 'gifts' | 'site' | 'share';

export interface ActionButton {
  action: ButtonAction;
  label: string;
  url?: string;
}

export interface ButtonsBlock extends TemplateBlockBase {
  type: 'buttons';
  buttons: ActionButton[];
}

export interface DividerBlock extends TemplateBlockBase {
  type: 'divider';
  variant?: 'line' | 'ornament' | 'space';
}

export interface OrnamentBlock extends TemplateBlockBase {
  type: 'ornament';
  ornament: string;
}

export type TemplateBlock =
  | TextBlock
  | DateTimeBlock
  | LocationBlock
  | CountdownBlock
  | TimelineBlock
  | GiftsBlock
  | ImageBlock
  | GalleryBlock
  | MusicVideoBlock
  | QrBlock
  | ButtonsBlock
  | DividerBlock
  | OrnamentBlock;

export interface TemplateDocument {
  version: 2;
  blocks: TemplateBlock[];
}

export function createBlockId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `blk_${Math.random().toString(36).slice(2, 10)}`;
}
