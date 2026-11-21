import http from 'node:http';
import { API_VERSION, ATLAS_HOST, ATLAS_PORT, REMOTE_HEADER, type Command, type Link, type Mood, type State } from './protocol.ts';
import { EventStreamReader } from './sse.ts';

/** Where the token Atlas gave is kept: the plugin's global settings. */
export interface TokenStore {
  load(): Promise<string | null>;
  save(token: string | null): Promise<void>;
}

export interface ConnectionOptions {
  host: string;
  port: number;
  /** How long to wait before asking again whether Atlas runs. */
  retryMs: number;
  /** The name Atlas shows in its pairing prompt. */
  client: string;
}

export type PairResult = 'paired' | 'denied' | 'busy' | 'offline';
export type CommandResult = 'ok' | 'refused' | 'offline' | 'unpaired';

interface Answer {
  status: number;
  body: string;
}

const REQUEST_TIMEOUT_MS = 5000;
/** The GM may take a while to switch to Obsidian and answer the prompt. */
const PAIR_TIMEOUT_MS = 120_000;

const DEFAULTS: ConnectionOptions = { host: ATLAS_HOST, port: ATLAS_PORT, retryMs: 2000, client: 'Stream Deck' };

/**
 * The plugin's one line to Atlas: asks whether Atlas runs, pairs, holds the event stream that tells what
 * plays, and sends commands. It reconnects by itself for as long as the plugin runs, so keys light up as soon
 * as Atlas starts and go dark when it stops.
 */
export class AtlasConnection {
  link: Link = 'offline';
  moods: Mood[] = [];
  state: State | null = null;
  private token: string | null = null;
  private stream: http.ClientRequest | null = null;
  private retry: NodeJS.Timeout | null = null;
  private running = false;
  private pairing = false;
  private readonly listeners = new Set<() => void>();
  private readonly options: ConnectionOptions;

  constructor(private readonly tokens: TokenStore, options: Partial<ConnectionOptions> = {}) {
    this.options = { ...DEFAULTS, ...options };
  }

  async start(): Promise<void> {
    this.running = true;
    this.token = await this.tokens.load();
    this.connect();
  }

  stop(): void {
    this.running = false;
    if (this.retry) clearTimeout(this.retry);
    this.stream?.destroy();
    this.stream = null;
  }

  onChange(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /** Asks Atlas for a token; Atlas asks the GM first. */
  async pair(): Promise<PairResult> {
    this.pairing = true;
    this.setLink('pairing');
    try {
      const answer = await this.request('POST', '/v1/pair', { body: { client: this.options.client }, timeoutMs: PAIR_TIMEOUT_MS });
      if (answer.status === 200) {
        const { token } = JSON.parse(answer.body) as { token?: unknown };
        if (typeof token === 'string') {
          this.token = token;
          await this.tokens.save(token);
          this.connect();
          return 'paired';
        }
      }
      this.connect();
      return answer.status === 409 ? 'busy' : 'denied';
    } catch {
      this.connect();
      return 'offline';
    } finally {
      this.pairing = false;
    }
  }

  async send(command: Command): Promise<CommandResult> {
    if (!this.token) return 'unpaired';
    try {
      const answer = await this.request('POST', '/v1/command', { body: command, token: this.token });
      if (answer.status === 401) {
        await this.forgetToken();
        return 'unpaired';
      }
      return answer.status === 204 ? 'ok' : 'refused';
    } catch {
      return 'offline';
    }
  }

  private connect(): void {
    if (!this.running) return;
    if (this.retry) clearTimeout(this.retry);
    this.retry = null;
    this.stream?.destroy();
    this.stream = null;
    if (this.token) this.listen(this.token);
    else void this.knock();
  }

  private later(): void {
    if (!this.running || this.retry) return;
    this.retry = setTimeout(() => {
      this.retry = null;
      this.connect();
    }, this.options.retryMs);
  }

  /** Unpaired: whether Atlas runs at all, so the property inspector can say what to do. */
  private async knock(): Promise<void> {
    try {
      const answer = await this.request('GET', '/v1/hello', {});
      const hello = JSON.parse(answer.body) as { app?: unknown; api?: unknown };
      if (!this.pairing) this.setLink(answer.status === 200 && hello.app === 'atlas-vtt' && hello.api === API_VERSION ? 'unpaired' : 'offline');
    } catch {
      if (!this.pairing) this.setLink('offline');
    }
    this.later();
  }

  private listen(token: string): void {
    const reader = new EventStreamReader();
    // A stream replaced or let go still reports its end; only the current one counts.
    const drop = (): void => {
      if (this.stream === request) this.dropped();
    };
    const request = http.request(this.requestOptions('GET', '/v1/events', token), (response) => {
      if (response.statusCode === 401) {
        response.resume();
        void this.forgetToken().then(() => this.connect());
        return;
      }
      if (response.statusCode !== 200) {
        response.resume();
        drop();
        return;
      }
      response.setEncoding('utf8');
      response.on('data', (chunk: string) => {
        for (const { event, data } of reader.push(chunk)) this.receive(event, data);
      });
      response.on('end', drop);
      response.on('error', drop);
    });
    request.on('error', drop);
    request.end();
    this.stream = request;
  }

  private receive(event: string, data: string): void {
    try {
      if (event === 'moods') this.moods = JSON.parse(data) as Mood[];
      else if (event === 'state') this.state = JSON.parse(data) as State;
      else return;
    } catch {
      return;
    }
    this.link = 'connected';
    this.emit();
  }

  private dropped(): void {
    this.stream = null;
    this.state = null;
    this.setLink('offline');
    this.later();
  }

  private async forgetToken(): Promise<void> {
    this.token = null;
    this.state = null;
    await this.tokens.save(null);
    this.setLink('unpaired');
  }

  private setLink(link: Link): void {
    if (this.link === link) return;
    this.link = link;
    this.emit();
  }

  private emit(): void {
    for (const listener of [...this.listeners]) listener();
  }

  private requestOptions(method: string, path: string, token?: string): http.RequestOptions {
    const headers: Record<string, string> = { [REMOTE_HEADER]: '1' };
    if (token) headers.authorization = `Bearer ${token}`;
    return { host: this.options.host, port: this.options.port, method, path, headers, agent: false };
  }

  private request(method: string, path: string, { body, token, timeoutMs = REQUEST_TIMEOUT_MS }: { body?: unknown; token?: string; timeoutMs?: number }): Promise<Answer> {
    return new Promise((resolve, reject) => {
      const options = this.requestOptions(method, path, token);
      if (body !== undefined) options.headers = { ...options.headers, 'content-type': 'application/json' };
      const request = http.request(options, (response) => {
        let text = '';
        response.setEncoding('utf8');
        response.on('data', (chunk: string) => { text += chunk; });
        response.on('end', () => resolve({ status: response.statusCode ?? 0, body: text }));
        response.on('error', reject);
      });
      request.setTimeout(timeoutMs, () => request.destroy(new Error('timeout')));
      request.on('error', reject);
      request.end(body === undefined ? undefined : JSON.stringify(body));
    });
  }
}
