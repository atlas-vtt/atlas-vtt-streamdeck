import assert from 'node:assert/strict';
import { test } from 'node:test';
import { nextMood, CONTROLS } from '../src/actions/controlSpecs.ts';
import { channelOf, levelOf, stepOf } from '../src/actions/levels.ts';
import type { Mood, State } from '../src/atlas/protocol.ts';
import { EventStreamReader } from '../src/atlas/sse.ts';
import { fit, formatDb, levelShare, moodKey, twoLines } from '../src/render/keys.ts';

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

test('Next mood names the mood after the one that plays, and the first after the last', () => {
  const moods = [mood('a'), mood('b'), mood('c')];
  assert.equal(nextMood(state, moods)?.id, 'c');
  assert.equal(nextMood({ ...state, mood: 'c' }, moods)?.id, 'a');
  assert.equal(nextMood(null, moods)?.id, 'a');
  assert.equal(nextMood(state, []), null);
});

test('controls light up for their state and go faint without music', () => {
  const look = (uuid: string, s: State | null) => CONTROLS.find((spec) => spec.uuid.endsWith(uuid))!.look(s, []);
  assert.equal(look('stop-all', { ...state, stopped: true }).label, 'Bring back');
  assert.equal(look('shuffle', { ...state, music: { ...state.music!, shuffle: true } }).lit, true);
  assert.equal(look('repeat', { ...state, music: { ...state.music!, repeat: 'one' } }).label, 'Repeat one');
  assert.equal(look('next-track', { ...state, music: null }).idle, true);
  assert.equal(look('play-pause', { ...state, music: { ...state.music!, paused: true } }).label, 'Play');
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
