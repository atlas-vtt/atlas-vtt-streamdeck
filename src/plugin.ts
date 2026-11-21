import streamDeck from '@elgato/streamdeck';
import type { JsonObject, JsonValue } from '@elgato/utils';
import { AtlasConnection, type PairResult } from './atlas/connection.ts';
import { controlAction } from './actions/controls.ts';
import { CONTROLS } from './actions/controlSpecs.ts';
import { MoodAction } from './actions/mood.ts';
import { VolumeAction } from './actions/volume.ts';

type GlobalSettings = { token?: string };

const atlas = new AtlasConnection({
  load: async () => (await streamDeck.settings.getGlobalSettings<GlobalSettings>()).token ?? null,
  save: (token) => streamDeck.settings.setGlobalSettings<GlobalSettings>(token ? { token } : {}),
});

const STATUS_TEXT: Record<AtlasConnection['link'], string> = {
  connected: 'Connected to Atlas.',
  unpaired: 'Atlas is running. Press Pair with Atlas, then allow it in Obsidian.',
  pairing: 'Switch to Obsidian and allow the Stream Deck there.',
  offline: 'Atlas is not reachable. Start Obsidian, and switch on Settings → Atlas VTT → Stream Deck → Control sound from a Stream Deck.',
};

const PAIR_TEXT: Record<PairResult, string> = {
  paired: 'Paired. Your keys now control Atlas.',
  denied: 'Atlas did not allow it. Press Pair with Atlas to ask again.',
  busy: 'Atlas is already asking. Answer the prompt in Obsidian.',
  offline: 'Atlas is not reachable.',
};

function status(message?: string): JsonObject {
  return { event: 'status', link: atlas.link, text: message ?? STATUS_TEXT[atlas.link] };
}

function tell(payload: JsonValue): void {
  // Nothing listens while no property inspector is open.
  if (streamDeck.ui.action) void streamDeck.ui.sendToPropertyInspector(payload).catch(() => undefined);
}

/** Messages from the property inspectors: the mood list for the picker, the pairing panel. */
streamDeck.ui.onSendToPlugin<{ event?: string }>((ev) => {
  const { event } = ev.payload as { event?: string };
  if (event === 'moods') {
    tell({ event: 'moods', items: atlas.moods.map((mood) => ({ label: mood.name, value: mood.id })) });
  } else if (event === 'status') {
    tell(status());
  } else if (event === 'pair') {
    tell(status());
    void atlas.pair().then((result) => tell(status(PAIR_TEXT[result])));
  }
});

let lastMoods = '';
atlas.onChange(() => {
  tell(status());
  // An open mood picker follows moods added or renamed in Atlas.
  const moods = JSON.stringify(atlas.moods.map((mood) => [mood.id, mood.name]));
  if (moods === lastMoods) return;
  lastMoods = moods;
  tell({ event: 'moods', items: atlas.moods.map((mood) => ({ label: mood.name, value: mood.id })) });
});

streamDeck.actions.registerAction(new MoodAction(atlas));
streamDeck.actions.registerAction(new VolumeAction(atlas));
for (const spec of CONTROLS) streamDeck.actions.registerAction(controlAction(spec, atlas));

await streamDeck.connect();
await atlas.start();
