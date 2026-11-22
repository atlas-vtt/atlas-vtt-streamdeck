import type { Command, Mood, State } from '../atlas/protocol.ts';
import type { ControlLook } from '../render/keys.ts';

/** A key that sends one command and shows one state: its look is a function of what Atlas says plays. */
export interface ControlSpec {
  uuid: string;
  /** What a press sends; a key whose press depends on the table (Show / take back) reads it from the state. */
  command: Command | ((state: State | null) => Command);
  look(state: State | null, moods: readonly Mood[]): Omit<ControlLook, 'link'>;
}

const noMusic = (state: State | null): boolean => !state?.music;
/** Atlas sends `combat: null` while there is no map to act on. */
const noMap = (state: State | null): boolean => !state?.combat;
const noCombatants = (state: State | null): boolean => noMap(state) || state?.combat?.combatants === 0;
const shown = (state: State | null): boolean => state?.player?.handout === true;
const noWindow = (state: State | null): boolean => state?.player?.open !== true;

const REPEAT_LOOK = {
  all: { glyph: 'repeat', label: 'Repeat all' },
  one: { glyph: 'repeatOne', label: 'Repeat one' },
  off: { glyph: 'repeatOff', label: 'Repeat off' },
} as const;

export const CONTROLS: readonly ControlSpec[] = [
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
  {
    uuid: 'dev.atlas-vtt.sound.combat',
    command: { type: 'combat' },
    look: (state) => state?.combat?.active
      ? { glyph: 'flag', label: 'End combat', lit: true, idle: false, caption: `Round ${state.combat.round}` }
      : { glyph: 'swords', label: 'Start combat', lit: false, idle: noCombatants(state) },
  },
  {
    uuid: 'dev.atlas-vtt.sound.roll-initiative',
    command: { type: 'rollInitiative' },
    look: (state) => ({ glyph: 'dices', label: 'Roll initiative', lit: false, idle: noCombatants(state) || state?.combat?.rolls !== true }),
  },
  {
    uuid: 'dev.atlas-vtt.sound.present',
    command: { type: 'present' },
    look: (state) => ({ glyph: 'eye', label: 'Present map', lit: state?.player?.presented === true, idle: noMap(state) }),
  },
  {
    uuid: 'dev.atlas-vtt.sound.freeze',
    command: { type: 'freeze' },
    look: (state) => {
      const frozen = state?.player?.frozen === true;
      return { glyph: frozen ? 'play' : 'pause', label: frozen ? 'Unfreeze' : 'Freeze camera', lit: frozen, idle: noWindow(state) || state?.player?.trueScale === true };
    },
  },
  {
    uuid: 'dev.atlas-vtt.sound.curtain',
    command: { type: 'curtain' },
    look: (state) => {
      const hidden = state?.player?.hidden === true;
      return { glyph: 'blinds', label: hidden ? 'Reveal the map' : 'Hide the map', lit: hidden, idle: noWindow(state) };
    },
  },
  {
    // One key for handouts: while players are shown an image or loot it takes it back, otherwise it shows them the image under
    // the pointer. What the pointer rests on is known only at the press, so the key is never faint; a press over no image
    // flashes the alert.
    uuid: 'dev.atlas-vtt.sound.handout',
    command: (state) => ({ type: shown(state) ? 'takeBackHandout' : 'showHoveredImage' }),
    look: (state) => shown(state)
      ? { glyph: 'imageOff', label: 'Take back', lit: true, idle: false }
      : { glyph: 'imagePlay', label: 'Show image', lit: false, idle: false },
  },
  {
    uuid: 'dev.atlas-vtt.sound.share-rolls',
    command: { type: 'shareRolls' },
    look: (state) => {
      const shown = state?.rollsShown === true;
      return { glyph: 'dice', label: shown ? 'Rolls shown' : 'Rolls hidden', lit: shown, idle: state?.rollsShown === undefined };
    },
  },
];
