/**
 * Atlas VTT's sound remote, version 1, as the plugin reads it. Atlas' side is
 * `src/app/soundRemote/remoteProtocol.ts` in the atlas-vtt repository: a change there is a change here.
 */
/** Atlas' fixed port; `ATLAS_REMOTE_PORT` overrides it for tests. */
export const ATLAS_PORT = Number(process.env.ATLAS_REMOTE_PORT) || 47823;
export const ATLAS_HOST = '127.0.0.1';
export const REMOTE_HEADER = 'x-atlas-remote';
export const API_VERSION = 1;

export type Channel = 'master' | 'music' | 'ambience' | 'musicStrip';
export type Repeat = 'all' | 'one' | 'off';

export type Command =
  | { type: 'mood'; id: string }
  | { type: 'nextMood' | 'stopAll' | 'pause' | 'nextTrack' | 'previousTrack' | 'shuffle' | 'repeat' | 'muteMusic' }
  | { type: 'level'; channel: Channel; db?: number; deltaDb?: number; reset?: true };

export interface Mood {
  id: string;
  name: string;
  tone: { light: string; dark: string };
  /** An SVG path on a 512 × 512 canvas. */
  crest: string;
}

export interface Music {
  paused: boolean;
  muted: boolean;
  shuffle: boolean;
  repeat: Repeat;
  levelDb: number;
  track: string | null;
}

export interface State {
  soundOn: boolean;
  mood: string | null;
  playing: boolean;
  stopped: boolean;
  music: Music | null;
  nowPlaying: string | null;
  levels: { masterDb: number; musicDb: number; ambienceDb: number };
  ranges: { channel: [number, number]; strip: [number, number] };
}

/** Where the plugin stands with Atlas. */
export type Link = 'offline' | 'unpaired' | 'pairing' | 'connected';
