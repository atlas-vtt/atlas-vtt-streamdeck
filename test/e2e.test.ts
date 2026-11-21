/**
 * The built plugin (bin/plugin.js, run `npm run build` first) under a stand-in Stream Deck app, against a
 * stand-in Atlas that speaks the remote's protocol: registration, pairing from the property inspector, the
 * mood picker's list, a key lit by the pushed state, and a press reaching Atlas.
 */
import assert from 'node:assert/strict';
import { spawn, type ChildProcess } from 'node:child_process';
import http from 'node:http';
import { after, test } from 'node:test';
import { WebSocketServer, type WebSocket } from 'ws';

const ATLAS_PORT = 47_950 + Math.floor(Math.random() * 40);
const TOKEN = 'a'.repeat(64);
const PLUGIN = 'dev.atlas-vtt.sound';

type Message = { event: string; context?: string; payload?: Record<string, unknown>; id?: string };

const commands: unknown[] = [];
const streams = new Set<http.ServerResponse>();
let state = { soundOn: true, mood: null as string | null, playing: false, stopped: false, music: null, nowPlaying: null, levels: { masterDb: 0, musicDb: 0, ambienceDb: 0 }, ranges: { channel: [-60, 6], strip: [-60, 12] } };
const moods = [{ id: 'tavern', name: 'Tavern', tone: { light: '#b45309', dark: '#f5a524' }, crest: 'M0 0h512v512H0z' }];

const atlas = http.createServer((request, response) => {
  const route = `${request.method} ${request.url}`;
  if (request.headers['x-atlas-remote'] !== '1' || request.headers.origin) {
    response.writeHead(403).end();
    return;
  }
  if (route === 'GET /v1/hello') {
    response.writeHead(200).end(JSON.stringify({ app: 'atlas-vtt', api: 1 }));
    return;
  }
  if (route === 'POST /v1/pair') {
    response.writeHead(200).end(JSON.stringify({ token: TOKEN }));
    return;
  }
  if (request.headers.authorization !== `Bearer ${TOKEN}`) {
    response.writeHead(401).end();
    return;
  }
  if (route === 'GET /v1/events') {
    response.writeHead(200, { 'content-type': 'text/event-stream' });
    response.write(`event: moods\ndata: ${JSON.stringify(moods)}\n\nevent: state\ndata: ${JSON.stringify(state)}\n\n`);
    streams.add(response);
    response.on('close', () => streams.delete(response));
    return;
  }
  let body = '';
  request.on('data', (chunk: Buffer) => { body += chunk.toString(); });
  request.on('end', () => {
    commands.push(JSON.parse(body));
    state = { ...state, mood: 'tavern', playing: true };
    for (const stream of streams) stream.write(`event: state\ndata: ${JSON.stringify(state)}\n\n`);
    response.writeHead(204).end();
  });
});

const host = new WebSocketServer({ port: 0, host: '127.0.0.1' });
const received: Message[] = [];
const waiters: Array<() => void> = [];
let socket: WebSocket | null = null;
let globalSettings: Record<string, unknown> = {};
let plugin: ChildProcess | null = null;

host.on('connection', (ws) => {
  socket = ws;
  ws.on('message', (data) => {
    const message = JSON.parse(data.toString()) as Message;
    if (message.event === 'getGlobalSettings') send({ event: 'didReceiveGlobalSettings', id: message.id, payload: { settings: globalSettings } });
    if (message.event === 'setGlobalSettings') globalSettings = message.payload ?? {};
    received.push(message);
    for (const wake of waiters.splice(0)) wake();
  });
});

function send(message: object): void {
  socket?.send(JSON.stringify(message));
}

/** Waits until the plugin has sent a message that passes `match`, and returns it. */
async function sent(match: (message: Message) => boolean, from = 0): Promise<Message> {
  const deadline = Date.now() + 8000;
  for (;;) {
    const found = received.slice(from).find(match);
    if (found) return found;
    if (Date.now() > deadline) throw new Error(`Not sent; got ${received.map((m) => m.event).join(', ')}`);
    await new Promise<void>((resolve) => { waiters.push(resolve); setTimeout(resolve, 100); });
  }
}

const image = (message: Message): string => Buffer.from(String(message.payload?.image).split(',')[1], 'base64').toString('utf8');

after(() => {
  plugin?.kill();
  host.close();
  for (const stream of streams) stream.destroy();
  atlas.close();
});

test('pairs, lists moods, lights the key that plays and sends a press', async () => {
  await new Promise<void>((resolve) => atlas.listen(ATLAS_PORT, '127.0.0.1', resolve));
  const address = host.address();
  const port = typeof address === 'object' && address ? address.port : 0;
  const info = { application: { font: '', language: 'en', platform: 'linux', platformVersion: '6', version: '7.1.0' }, plugin: { uuid: PLUGIN, version: '0.1.0.0' }, devicePixelRatio: 2, colors: {}, devices: [{ id: 'deck', name: 'Deck', size: { columns: 5, rows: 3 }, type: 0 }] };
  plugin = spawn(process.execPath, ['bin/plugin.js', '-port', String(port), '-pluginUUID', PLUGIN, '-registerEvent', 'registerPlugin', '-info', JSON.stringify(info)], {
    cwd: 'dev.atlas-vtt.sound.sdPlugin',
    env: { ...process.env, ATLAS_REMOTE_PORT: String(ATLAS_PORT) },
    stdio: 'ignore',
  });
  await sent((m) => m.event === 'registerPlugin');

  const key = { action: `${PLUGIN}.mood`, context: 'key-1', device: 'deck' };
  send({ event: 'willAppear', ...key, payload: { controller: 'Keypad', coordinates: { column: 0, row: 0 }, isInMultiAction: false, settings: { moodId: 'tavern' }, state: 0 } });
  send({ event: 'propertyInspectorDidAppear', ...key });

  // Unpaired: the inspector is told so, and pairing gives the token, which is kept in the global settings.
  await sent((m) => m.event === 'sendToPropertyInspector' && m.payload?.link === 'unpaired');
  send({ event: 'sendToPlugin', ...key, payload: { event: 'pair' } });
  await sent((m) => m.event === 'sendToPropertyInspector' && m.payload?.text === 'Paired. Your keys now control Atlas.');
  assert.deepEqual(globalSettings, { token: TOKEN });

  const mark = received.length;
  send({ event: 'sendToPlugin', ...key, payload: { event: 'moods' } });
  // The answer, or the push that follows once the stream has brought the moods (the picker hot-reloads).
  const list = await sent((m) => m.event === 'sendToPropertyInspector' && m.payload?.event === 'moods' && Array.isArray(m.payload.items) && m.payload.items.length > 0, mark);
  assert.deepEqual(list.payload?.items, [{ label: 'Tavern', value: 'tavern' }]);

  const idle = await sent((m) => m.event === 'setImage' && m.context === 'key-1' && image(m).includes('Tavern'));
  assert.ok(!image(idle).includes('stroke-width="6"'), 'not lit before it plays');

  const pressed = received.length;
  send({ event: 'keyDown', ...key, payload: { coordinates: { column: 0, row: 0 }, isInMultiAction: false, settings: { moodId: 'tavern' }, state: 0 } });
  const lit = await sent((m) => m.event === 'setImage' && m.context === 'key-1', pressed);
  assert.deepEqual(commands, [{ type: 'mood', id: 'tavern' }]);
  assert.ok(image(lit).includes('stroke-width="6"'), 'lit once Atlas says it plays');
});
