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
  | { type: 'roll'; id: string }
  | { type: 'stopAll' | 'pause' | 'nextTrack' | 'previousTrack' | 'shuffle' | 'repeat' | 'muteMusic' }
  | { type: 'combat' | 'rollInitiative' | 'present' | 'freeze' | 'curtain' | 'takeBackHandout' | 'showHoveredImage' | 'shareRolls' }
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

/** The fight on the map the GM has in front. */
export interface Combat {
  active: boolean;
  round: number;
  combatants: number;
  /** The map's rules roll numbers; a fight by sides or by cards rolls nothing. */
  rolls: boolean;
}

/** The local player window, as its bar in Atlas shows it. */
export interface Player {
  open: boolean;
  /** The map the GM has in front is the one players are shown. */
  presented: boolean;
  frozen: boolean;
  /** TrueScale pins the players' camera: no freezing then. */
  trueScale: boolean;
  /** The curtain is down: players see black. */
  hidden: boolean;
  /** Players are shown an image or loot. */
  handout: boolean;
}

/** How a saved roll's place in Atlas' dice tray draws it: its first die, how many, its rule, the rest, a designed die's colour. */
export interface RollLook {
  sides: number | null;
  count: number;
  rule: string;
  rest: string;
  colour: string | null;
}

/** A saved roll of the map in front's collection. */
export interface Roll {
  id: string;
  name: string;
  formula: string;
  look: RollLook;
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
  /** Null while there is no map to act on; absent from an Atlas without combat keys. */
  combat?: Combat | null;
  /** Absent from an Atlas without player window keys. */
  player?: Player;
  /** The saved rolls of the map in front's collection; absent from an Atlas without dice keys. */
  rolls?: Roll[];
  /** "Show my rolls to players" is on. */
  rollsShown?: boolean;
}

/** Where the plugin stands with Atlas. */
export type Link = 'offline' | 'unpaired' | 'pairing' | 'connected';
