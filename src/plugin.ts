import streamDeck from '@elgato/streamdeck';
import type { JsonObject, JsonValue } from '@elgato/utils';
import { AtlasConnection, type PairResult } from './atlas/connection.ts';
import { controlAction } from './actions/controls.ts';
import { CONTROLS } from './actions/controlSpecs.ts';
import { MoodAction } from './actions/mood.ts';
import { RollAction } from './actions/roll.ts';
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
  offline: 'Atlas is not reachable. Start Obsidian, and switch on Settings → Atlas VTT → Stream Deck → Control Atlas from a Stream Deck.',
};

const PAIR_TEXT: Record<PairResult, string> = {
  paired: 'Paired. Your keys now control Atlas.',
  denied: 'Atlas did not allow it. Press Pair with Atlas to ask again.',
  busy: 'Atlas is already asking. Answer the prompt in Obsidian.',
  offline: 'Atlas is not reachable.',
};

const SOUND_OFF_TEXT = 'Connected, but sound is not ready in Atlas yet.';

function status(message?: string): JsonObject {
  const soundOff = atlas.link === 'connected' && atlas.state?.soundOn === false;
  return { event: 'status', link: atlas.link, text: message ?? (soundOff ? SOUND_OFF_TEXT : STATUS_TEXT[atlas.link]) };
}

/** The roll picker's list: the saved rolls of the map in front, named with what they roll. */
const rollItems = (): JsonObject => ({ event: 'rolls', items: (atlas.state?.rolls ?? []).map((roll) => ({ label: `${roll.name} (${roll.formula})`, value: roll.id })) });

function tell(payload: JsonValue): void {
  // Nothing listens while no property inspector is open.
  if (streamDeck.ui.action) void streamDeck.ui.sendToPropertyInspector(payload).catch(() => undefined);
}

/** Messages from the property inspectors: the mood and roll lists for the pickers, the pairing panel. */
streamDeck.ui.onSendToPlugin<{ event?: string }>((ev) => {
  const { event } = ev.payload as { event?: string };
  if (event === 'moods') {
    tell({ event: 'moods', items: atlas.moods.map((mood) => ({ label: mood.name, value: mood.id })) });
  } else if (event === 'rolls') {
    tell(rollItems());
  } else if (event === 'status') {
    tell(status());
  } else if (event === 'pair') {
    tell(status());
    void atlas.pair().then((result) => tell(status(PAIR_TEXT[result])));
  }
});

// A panel asks for the status as it loads, and the host may tell the plugin it appeared only after
// that ask (OpenDeck does), when there was no panel to answer yet: answer again once it has.
streamDeck.ui.onDidAppear(() => {
  tell(status());
  tell({ event: 'moods', items: atlas.moods.map((mood) => ({ label: mood.name, value: mood.id })) });
  tell(rollItems());
});

let lastMoods = '';
let lastRolls = '';
let lastLink = atlas.link;
atlas.onChange(() => {
  if (atlas.link !== lastLink) {
    lastLink = atlas.link;
    streamDeck.logger.info(`Atlas: ${atlas.link}`);
  }
  tell(status());
  // An open roll picker follows the map in front and rolls saved or renamed in Atlas.
  const rolls = rollItems();
  const rollsText = JSON.stringify(rolls);
  if (rollsText !== lastRolls) {
    lastRolls = rollsText;
    tell(rolls);
  }
  // An open mood picker follows moods added or renamed in Atlas.
  const moods = JSON.stringify(atlas.moods.map((mood) => [mood.id, mood.name]));
  if (moods === lastMoods) return;
  lastMoods = moods;
  tell({ event: 'moods', items: atlas.moods.map((mood) => ({ label: mood.name, value: mood.id })) });
});

streamDeck.actions.registerAction(new MoodAction(atlas));
streamDeck.actions.registerAction(new RollAction(atlas));
streamDeck.actions.registerAction(new VolumeAction(atlas));
for (const spec of CONTROLS) streamDeck.actions.registerAction(controlAction(spec, atlas));

await streamDeck.connect();
await atlas.start();
