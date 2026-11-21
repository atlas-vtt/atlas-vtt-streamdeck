import type { Channel, State } from '../atlas/protocol.ts';

/** Values from the property inspector's selects, which store text. */
export type VolumeSettings = { channel?: string; step?: string };

export const CHANNEL_NAMES: Record<Channel, string> = { master: 'Master', music: 'Music', ambience: 'Ambience', musicStrip: 'Music in mix' };

export const channelOf = (settings: VolumeSettings): Channel => (settings.channel && settings.channel in CHANNEL_NAMES ? (settings.channel as Channel) : 'master');

/** dB per press, or per notch of a dial; 0 on a key sets the level back to 0 dB. */
export function stepOf(settings: VolumeSettings, dial: boolean): number {
  const step = Number(settings.step);
  if (!Number.isFinite(step)) return dial ? 1 : 2;
  return dial ? Math.max(0.5, Math.abs(step)) : step;
}

/** The channel's level now and its range; the music strip has none while no music plays. */
export function levelOf(state: State | null, channel: Channel): { db: number | null; range: [number, number] } {
  if (!state) return { db: null, range: [-60, 6] };
  if (channel === 'musicStrip') return { db: state.music?.levelDb ?? null, range: state.ranges.strip };
  const db = channel === 'master' ? state.levels.masterDb : channel === 'music' ? state.levels.musicDb : state.levels.ambienceDb;
  return { db, range: state.ranges.channel };
}
