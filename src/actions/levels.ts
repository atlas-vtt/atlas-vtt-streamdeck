import type { Channel, State } from '../atlas/protocol.ts';

/** Values from the property inspector's selects, which store text. */
export type VolumeSettings = { channel?: string; step?: string };

export const CHANNEL_NAMES: Record<Channel, string> = { master: 'Master', music: 'Music', ambience: 'Ambience' };

/** What the key says while its channel has nothing to move. */
export const EMPTY_CHANNEL: Record<Channel, string> = { master: '', music: 'No music', ambience: 'No layers' };

/** 0.2.0's "Music in mix" is the Music key now. */
const FORMER_CHANNELS: Record<string, Channel> = { musicStrip: 'music' };

export function channelOf(settings: VolumeSettings): Channel {
  const channel = settings.channel ?? '';
  if (channel in CHANNEL_NAMES) return channel as Channel;
  return FORMER_CHANNELS[channel] ?? 'master';
}

/** Settings saved with a former channel, as the property inspector can show them; null where nothing changes. */
export function migratedSettings(settings: VolumeSettings): VolumeSettings | null {
  const channel = settings.channel && FORMER_CHANNELS[settings.channel];
  return channel ? { ...settings, channel } : null;
}

/** dB per press, or per notch of a dial; 0 on a key sets the level back to 0 dB. */
export function stepOf(settings: VolumeSettings, dial: boolean): number {
  const step = Number(settings.step);
  if (!Number.isFinite(step)) return dial ? 1 : 2;
  return dial ? Math.max(0.5, Math.abs(step)) : step;
}

/** The channel's level now and its range; Music and Ambience have none while the mix holds no music or layers. */
export function levelOf(state: State | null, channel: Channel): { db: number | null; range: [number, number] } {
  if (!state) return { db: null, range: [-60, 6] };
  const db = channel === 'master' ? state.levels.masterDb : channel === 'music' ? state.levels.musicDb : state.levels.ambienceDb;
  return { db, range: state.ranges.channel };
}
