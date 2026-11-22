import assert from 'node:assert/strict';
import { test } from 'node:test';
import { CONTROLS } from '../src/actions/controlSpecs.ts';
import { channelOf, levelOf, stepOf } from '../src/actions/levels.ts';
import type { Mood, State } from '../src/atlas/protocol.ts';
import { EventStreamReader } from '../src/atlas/sse.ts';
import { fit, formatDb, levelShare, moodKey, rollKey, twoLines } from '../src/render/keys.ts';

const mood = (id: string, name = id): Mood => ({ id, name, tone: { light: '#000', dark: '#fff' }, crest: 'M0 0h512v512H0z' });
const state: State = {
  soundOn: true, mood: 'b', playing: true, stopped: false,
  music: { paused: false, muted: false, shuffle: false, repeat: 'all', levelDb: -4, track: 'Song' },
  nowPlaying: 'B', levels: { masterDb: -6, musicDb: 0, ambienceDb: -12 }, ranges: { channel: [-60, 6], strip: [-60, 12] },
};

test('reads server-sent events across chunks, skipping comments', () => {
  const reader = new EventStreamReader();
  assert.deepEqual(reader.push(': ping\n\nevent: state\ndata: {"a"'), []);
  assert.deepEqual(reader.push(':1}\n\nevent: moods\r\ndata: []\r\n\r\n'), [{ event: 'state', data: '{"a":1}' }, { event: 'moods', data: '[]' }]);
});

test('controls light up for their state and go faint without music', () => {
  const look = (uuid: string, s: State | null) => CONTROLS.find((spec) => spec.uuid.endsWith(uuid))!.look(s, []);
  assert.equal(look('stop-all', { ...state, stopped: true }).label, 'Bring back');
  assert.equal(look('shuffle', { ...state, music: { ...state.music!, shuffle: true } }).lit, true);
  assert.equal(look('repeat', { ...state, music: { ...state.music!, repeat: 'one' } }).label, 'Repeat one');
  assert.equal(look('next-track', { ...state, music: null }).idle, true);
  assert.equal(look('play-pause', { ...state, music: { ...state.music!, paused: true } }).label, 'Play');
});

test('combat and player window keys follow the table and go faint without it', () => {
  const look = (uuid: string, s: State | null) => CONTROLS.find((spec) => spec.uuid.endsWith(uuid))!.look(s, []);
  const combat = { active: false, round: 0, combatants: 3, rolls: true };
  const player = { open: true, presented: false, frozen: false, trueScale: false, hidden: false, handout: false };
  assert.deepEqual(look('.combat', { ...state, combat: { ...combat, active: true, round: 4 } }), { glyph: 'flag', label: 'End combat', lit: true, idle: false, caption: 'Round 4' });
  assert.equal(look('.combat', { ...state, combat }).label, 'Start combat');
  assert.equal(look('.combat', { ...state, combat: { ...combat, combatants: 0 } }).idle, true);
  assert.equal(look('.combat', { ...state, combat: null }).idle, true);
  assert.equal(look('roll-initiative', { ...state, combat }).idle, false);
  assert.equal(look('roll-initiative', { ...state, combat: { ...combat, rolls: false } }).idle, true);
  assert.equal(look('present', { ...state, combat, player: { ...player, presented: true } }).lit, true);
  assert.equal(look('present', { ...state, combat: null, player }).idle, true);
  assert.equal(look('freeze', { ...state, player: { ...player, frozen: true } }).label, 'Unfreeze');
  assert.equal(look('freeze', { ...state, player: { ...player, trueScale: true } }).idle, true);
  assert.equal(look('curtain', { ...state, player: { ...player, hidden: true } }).label, 'Reveal the map');
  assert.equal(look('curtain', { ...state, player: { ...player, open: false } }).idle, true);
  assert.equal(look('take-back-handout', { ...state, player }).idle, true);
  assert.equal(look('take-back-handout', { ...state, player: { ...player, handout: true } }).idle, false);
  assert.equal(look('show-image', null).idle, false);
  assert.equal(look('share-rolls', { ...state, rollsShown: true }).label, 'Rolls shown');
  assert.equal(look('share-rolls', { ...state, rollsShown: false }).lit, false);
  assert.equal(look('share-rolls', state).idle, true);
  // An Atlas without these keys sends neither part: the keys stay faint.
  assert.equal(look('.combat', state).idle, true);
  assert.equal(look('freeze', state).idle, true);
});

test('levels read the channel, its range and the step from the inspector\'s text', () => {
  assert.equal(channelOf({ channel: 'ambience' }), 'ambience');
  assert.equal(channelOf({ channel: 'players' }), 'master');
  assert.equal(stepOf({ step: '-5' }, false), -5);
  assert.equal(stepOf({ step: '-5' }, true), 5);
  assert.equal(stepOf({}, false), 2);
  assert.deepEqual(levelOf(state, 'musicStrip'), { db: -4, range: [-60, 12] });
  assert.deepEqual(levelOf(state, 'ambience'), { db: -12, range: [-60, 6] });
  assert.equal(levelShare(-27, [-60, 6]), 0.5);
  assert.equal(formatDb(-6), '−6 dB');
  assert.equal(formatDb(3), '+3 dB');
});

test('names are escaped and fitted to a key', () => {
  assert.equal(fit('Tavern', 10), 'Tavern');
  assert.equal(fit('A very long mood name', 10), 'A very lo…');
  assert.deepEqual(twoLines('The Sunken Cathedral'), ['The Sunken', 'Cathedral']);
  assert.equal(twoLines('Tavern'), null);
  const svg = moodKey({ mood: mood('x', '<script>&"'), active: true, link: 'connected' });
  assert.ok(!svg.includes('<script>'));
  assert.ok(svg.includes('&#60;script&#62;&#38;&#34;'));
});

test('a roll key draws its die and marks, and a placeholder where the map in front has no such roll', () => {
  const roll = { id: 'fire', name: 'Fire bolt', formula: '2d10 + 2', look: { sides: 10, count: 2, rule: '', rest: '+2', colour: '#ff6600' } };
  const svg = rollKey({ roll, chosen: true, link: 'connected' });
  assert.ok(svg.includes('Fire bolt') && svg.includes('2×') && svg.includes('+2') && svg.includes('#ff6600'));
  assert.ok(rollKey({ roll: null, chosen: true, link: 'connected' }).includes('Not here'));
  assert.ok(rollKey({ roll: null, chosen: false, link: 'connected' }).includes('Choose'));
});
