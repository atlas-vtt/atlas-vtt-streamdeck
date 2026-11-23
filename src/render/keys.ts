import type { Link, Mood, Roll } from '../atlas/protocol.ts';
import { GLYPHS, type GlyphName } from './glyphs.ts';

/**
 * Key images, drawn as SVG at 144 × 144 (a key's @2x size) so they stay sharp on every Stream Deck. Only
 * what Qt's SVG renderer (the Elgato app) and a browser canvas (OpenDeck) both draw: shapes, gradients,
 * transforms and text; no filters.
 */
const SIZE = 144;
const FONT = 'Helvetica Neue, Helvetica, Arial, sans-serif';
export const INK = '#f2efe8';
const MUTED = '#8d8a99';
/** Atlas' gold (the heraldic "or"), for a lit control. */
export const GOLD = '#e3b341';
const FLOOR_TOP = '#22212a';
const FLOOR_BOTTOM = '#111015';

const escapeXml = (text: string): string => text.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

/** A text cut to what a key holds, with an ellipsis. */
export function fit(text: string, chars: number): string {
  const clean = text.trim();
  return clean.length <= chars ? clean : `${clean.slice(0, chars - 1).trimEnd()}…`;
}

/** Two lines of a name that does not fit one: split at the space nearest its middle. */
export function twoLines(text: string): [string, string] | null {
  const clean = text.trim();
  if (clean.length <= 11 || !clean.includes(' ')) return null;
  const middle = clean.length / 2;
  let at = -1;
  for (let index = clean.indexOf(' '); index !== -1; index = clean.indexOf(' ', index + 1)) {
    if (at === -1 || Math.abs(index - middle) < Math.abs(at - middle)) at = index;
  }
  return [fit(clean.slice(0, at), 13), fit(clean.slice(at + 1), 13)];
}

/** A mood's name under its crest: one line in large type, else two in smaller type. */
function nameLabel(text: string, color: string): string {
  const lines = twoLines(text);
  if (!lines) return label(text, 122, color);
  const line = (part: string, y: number): string => `<text x="72" y="${y}" text-anchor="middle" font-family="${FONT}" font-weight="700" font-size="16" fill="${color}">${escapeXml(part)}</text>`;
  return `${line(lines[0], 113)}${line(lines[1], 133)}`;
}

/** Larger type for shorter names, so "Tavern" fills its key and a longer one still fits. */
function label(text: string, y: number, color: string, maxSize = 22): string {
  const size = text.length <= 7 ? maxSize : text.length <= 10 ? maxSize - 4 : text.length <= 13 ? maxSize - 7 : maxSize - 9;
  const shown = fit(text, 17);
  return `<text x="72" y="${y}" text-anchor="middle" font-family="${FONT}" font-weight="700" font-size="${size}" fill="${color}">${escapeXml(shown)}</text>`;
}

function floor(tint?: string, tintOpacity = 0.22): string {
  const tintLayer = tint ? `<rect width="${SIZE}" height="${SIZE}" fill="${tint}" fill-opacity="${tintOpacity}"/>` : '';
  return `<defs><linearGradient id="f" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${FLOOR_TOP}"/><stop offset="1" stop-color="${FLOOR_BOTTOM}"/></linearGradient></defs><rect width="${SIZE}" height="${SIZE}" fill="url(#f)"/>${tintLayer}`;
}

/** A lit key's ring, just inside the key's edge. */
function ring(color: string): string {
  return `<rect x="5" y="5" width="134" height="134" rx="18" fill="none" stroke="${color}" stroke-width="6"/>`;
}

export function glyph(name: GlyphName, x: number, y: number, size: number, color: string): string {
  const { body, solid } = GLYPHS[name] as { body: string; solid?: boolean };
  const scale = size / 24;
  return `<g transform="translate(${x} ${y}) scale(${scale})" fill="${solid ? color : 'none'}" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${body}</g>`;
}

/** Atlas not reachable, or not paired: a small badge in the corner, over the dimmed key. */
function linkBadge(link: Link): string {
  if (link === 'connected') return '';
  const name: GlyphName = link === 'offline' ? 'unplug' : 'key';
  return `<circle cx="120" cy="24" r="17" fill="#000" fill-opacity="0.7"/>${glyph(name, 108, 12, 24, GOLD)}`;
}

const svg = (body: string): string => `<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}" viewBox="0 0 ${SIZE} ${SIZE}">${body}</svg>`;

const dimmed = (body: string, dim: boolean): string => (dim ? `<g opacity="0.38">${body}</g>` : body);

/** The image Stream Deck takes: an SVG as a data URL. */
export const imageOf = (markup: string): string => `data:image/svg+xml;base64,${Buffer.from(markup, 'utf8').toString('base64')}`;

export interface MoodLook {
  mood: Mood | null;
  active: boolean;
  link: Link;
}

/** A mood's key: its crest in its tone, its name below; lit in its tone while it plays. */
export function moodKey({ mood, active, link }: MoodLook): string {
  if (!mood) {
    const body = `${floor()}${glyph('music', 48, 26, 48, MUTED)}${label('Choose', 112, MUTED, 18)}${label('a mood', 132, MUTED, 18)}`;
    return svg(`${dimmed(body, link !== 'connected')}${linkBadge(link)}`);
  }
  const tone = mood.tone.dark;
  const crest = `<g transform="translate(36 8) scale(${72 / 512})"><path d="${escapeXml(mood.crest)}" fill="${active ? INK : tone}"/></g>`;
  const body = active
    ? `${floor(tone, 0.85)}${crest}${ring(INK)}${nameLabel(mood.name, INK)}`
    : `${floor(tone, 0.12)}${crest}${nameLabel(mood.name, INK)}`;
  return svg(`${dimmed(body, link !== 'connected')}${linkBadge(link)}`);
}

/** A die's outline around (72, 50), by its faces, as the tray's row draws a die's body. */
export function dieOutline(sides: number | null): string {
  const corners = (count: number, turn: number, radius = 38): string => Array.from({ length: count }, (_, i) => {
    const angle = turn + (i * 2 * Math.PI) / count;
    return `${(72 + radius * Math.cos(angle)).toFixed(1)},${(50 + radius * Math.sin(angle)).toFixed(1)}`;
  }).join(' ');
  if (sides === 4) return `<polygon points="${corners(3, -Math.PI / 2, 42)}"/>`;
  if (sides === 6) return '<rect x="42" y="20" width="60" height="60" rx="10"/>';
  if (sides === 8) return `<polygon points="${corners(4, -Math.PI / 2)}"/>`;
  if (sides === 10 || sides === 100) return '<polygon points="72,12 108,46 72,88 36,46"/>';
  if (sides === 12) return `<polygon points="${corners(5, -Math.PI / 2)}"/>`;
  if (sides === null) return '<rect x="42" y="20" width="60" height="60" rx="30"/>';
  return `<polygon points="${corners(6, -Math.PI / 2)}"/>`;
}

export interface RollLookOptions {
  /** The saved roll, while the map in front's collection has it; null draws a placeholder. */
  roll: Roll | null;
  /** Whether a key has been given a roll at all. */
  chosen: boolean;
  link: Link;
}

/** A saved roll's key: the body of its first die in its colour, how many and what else at its corners, its name below. */
export function rollKey({ roll, chosen, link }: RollLookOptions): string {
  if (!roll) {
    const body = `${floor()}${glyph('dices', 48, 26, 48, MUTED)}${label(chosen ? 'Not here' : 'Choose', 112, MUTED, 18)}${label(chosen ? 'on this map' : 'a roll', 132, MUTED, 18)}`;
    return svg(`${dimmed(body, link !== 'connected')}${linkBadge(link)}`);
  }
  const { look } = roll;
  const fill = look.colour ?? 'none';
  const die = `<g fill="${escapeXml(fill)}" fill-opacity="${look.colour ? 0.85 : 0}" stroke="${INK}" stroke-width="4" stroke-linejoin="round">${dieOutline(look.sides)}</g>`;
  const faces = look.sides === null ? '' : `<text x="72" y="58" text-anchor="middle" font-family="${FONT}" font-weight="700" font-size="22" fill="${INK}">${look.sides}</text>`;
  const mark = (text: string, x: number, anchor: string, y: number): string => (text ? `<text x="${x}" y="${y}" text-anchor="${anchor}" font-family="${FONT}" font-weight="700" font-size="17" fill="${GOLD}">${escapeXml(fit(text, 7))}</text>` : '');
  const count = mark(look.count > 1 ? `${look.count}×` : '', 12, 'start', 26);
  const rest = mark(`${look.rule}${look.rest}`, 132, 'end', 90);
  return svg(`${dimmed(`${floor()}${die}${faces}${count}${rest}${nameLabel(roll.name, INK)}`, link !== 'connected')}${linkBadge(link)}`);
}

export interface ControlLook {
  glyph: GlyphName;
  label: string;
  /** Lit in gold: the control's state is on (shuffle, stopped, muted). */
  lit: boolean;
  /** Nothing to act on (no music for Shuffle): drawn faint. */
  idle: boolean;
  link: Link;
  /** A line under the label: the track that plays, the mood that comes next. */
  caption?: string | null;
}

/** A transport or toggle key: a glyph, its name, gold while on. */
export function controlKey(look: ControlLook): string {
  const color = look.lit ? FLOOR_BOTTOM : look.idle ? MUTED : INK;
  const glyphY = look.caption ? 18 : 26;
  const top = look.lit ? `${floor(GOLD, 0.92)}` : floor();
  const caption = look.caption ? `<text x="72" y="134" text-anchor="middle" font-family="${FONT}" font-size="15" fill="${look.lit ? FLOOR_BOTTOM : MUTED}">${escapeXml(fit(look.caption, 18))}</text>` : '';
  const body = `${top}${glyph(look.glyph, 44, glyphY, 56, color)}${label(look.label, look.caption ? 108 : 120, color, 20)}${caption}`;
  return svg(`${dimmed(body, look.link !== 'connected')}${linkBadge(look.link)}`);
}

export interface LevelLook {
  label: string;
  db: number | null;
  range: [number, number];
  /** What a press does: "+2 dB", "−2 dB", "0 dB". */
  step: string;
  /** Said in place of the level while there is none to move ("No layers"). */
  empty?: string;
  link: Link;
}

export const formatDb = (db: number): string => `${db > 0 ? '+' : db < 0 ? '−' : ''}${Math.abs(Math.round(db))} dB`;

/** Where a level stands in its range, 0 to 1. */
export const levelShare = (db: number, [min, max]: [number, number]): number => Math.min(1, Math.max(0, (db - min) / (max - min)));

/** A level key: the channel, its level now, a bar, and what a press does. */
export function levelKey(look: LevelLook): string {
  const share = look.db === null ? 0 : levelShare(look.db, look.range);
  const value = look.db === null ? (look.empty || '–') : formatDb(look.db);
  const valueSize = look.db === null && look.empty ? 20 : 30;
  const body = `${floor()}${glyph(look.db === look.range[0] ? 'volumeMuted' : 'volume', 14, 12, 28, MUTED)}`
    + `<text x="130" y="34" text-anchor="end" font-family="${FONT}" font-weight="700" font-size="20" fill="${GOLD}">${escapeXml(look.step)}</text>`
    + `<text x="72" y="82" text-anchor="middle" font-family="${FONT}" font-weight="700" font-size="${valueSize}" fill="${INK}">${escapeXml(value)}</text>`
    + `<rect x="16" y="96" width="112" height="10" rx="5" fill="#000" fill-opacity="0.5"/>`
    + `<rect x="16" y="96" width="${Math.max(10, Math.round(112 * share))}" height="10" rx="5" fill="${GOLD}"/>`
    + `<text x="72" y="132" text-anchor="middle" font-family="${FONT}" font-size="17" fill="${MUTED}">${escapeXml(fit(look.label, 16))}</text>`;
  return svg(`${dimmed(body, look.link !== 'connected')}${linkBadge(look.link)}`);
}

/** A glyph alone, for a dial's touch strip. */
export function glyphIcon(name: GlyphName, color = INK): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="72" height="72" viewBox="0 0 72 72">${glyph(name, 12, 12, 48, color)}</svg>`;
}
