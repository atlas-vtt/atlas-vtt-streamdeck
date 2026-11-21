import type { Command, Mood, State } from '../atlas/protocol.ts';
import type { ControlLook } from '../render/keys.ts';

/** A key that sends one command and shows one state: its look is a function of what Atlas says plays. */
export interface ControlSpec {
  uuid: string;
  command: Command;
  look(state: State | null, moods: readonly Mood[]): Omit<ControlLook, 'link'>;
}

/** The mood a press of Next mood brings: the one after the mood that plays, else the first. */
export function nextMood(state: State | null, moods: readonly Mood[]): Mood | null {
  if (moods.length === 0) return null;
  const index = moods.findIndex((mood) => mood.id === state?.mood);
  return moods[(index + 1) % moods.length] ?? null;
}

const noMusic = (state: State | null): boolean => !state?.music;

const REPEAT_LOOK = {
  all: { glyph: 'repeat', label: 'Repeat all' },
  one: { glyph: 'repeatOne', label: 'Repeat one' },
  off: { glyph: 'repeatOff', label: 'Repeat off' },
} as const;

export const CONTROLS: readonly ControlSpec[] = [
  {
    uuid: 'dev.atlas-vtt.sound.next-mood',
    command: { type: 'nextMood' },
    look: (state, moods) => ({ glyph: 'fastForward', label: 'Next mood', lit: false, idle: moods.length === 0, caption: nextMood(state, moods)?.name ?? null }),
  },
  {
    uuid: 'dev.atlas-vtt.sound.stop-all',
    command: { type: 'stopAll' },
    look: (state) => state?.stopped
      ? { glyph: 'play', label: 'Bring back', lit: true, idle: false }
      : { glyph: 'square', label: 'Stop all', lit: false, idle: !state?.playing },
  },
  {
    uuid: 'dev.atlas-vtt.sound.play-pause',
    command: { type: 'pause' },
    look: (state) => {
      const paused = state?.music?.paused === true || state?.stopped === true;
      return { glyph: paused ? 'play' : 'pause', label: paused ? 'Play' : 'Pause', lit: paused, idle: noMusic(state), caption: state?.music?.track ?? null };
    },
  },
  {
    uuid: 'dev.atlas-vtt.sound.next-track',
    command: { type: 'nextTrack' },
    look: (state) => ({ glyph: 'skipForward', label: 'Next track', lit: false, idle: noMusic(state), caption: state?.music?.track ?? null }),
  },
  {
    uuid: 'dev.atlas-vtt.sound.previous-track',
    command: { type: 'previousTrack' },
    look: (state) => ({ glyph: 'skipBack', label: 'Previous', lit: false, idle: noMusic(state) }),
  },
  {
    uuid: 'dev.atlas-vtt.sound.shuffle',
    command: { type: 'shuffle' },
    look: (state) => ({ glyph: 'shuffle', label: 'Shuffle', lit: state?.music?.shuffle === true, idle: noMusic(state) }),
  },
  {
    uuid: 'dev.atlas-vtt.sound.repeat',
    command: { type: 'repeat' },
    look: (state) => {
      const repeat = state?.music?.repeat ?? 'all';
      return { ...REPEAT_LOOK[repeat], lit: repeat !== 'all', idle: noMusic(state) };
    },
  },
  {
    uuid: 'dev.atlas-vtt.sound.mute-music',
    command: { type: 'muteMusic' },
    look: (state) => {
      const muted = state?.music?.muted === true;
      return { glyph: muted ? 'volumeMuted' : 'volume', label: muted ? 'Unmute' : 'Mute music', lit: muted, idle: noMusic(state) };
    },
  },
];
