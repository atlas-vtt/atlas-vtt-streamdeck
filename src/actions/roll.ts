import { action } from '@elgato/streamdeck';
import type { CommandResult } from '../atlas/connection.ts';
import { rollKey } from '../render/keys.ts';
import { AtlasAction } from './base.ts';

export type RollSettings = { rollId?: string };

/**
 * Rolls a saved roll of the Atlas map in front, by its id, as the dice tray does. A collection keeps its own
 * rolls, so the key goes faint on a map whose collection has no roll of that id.
 */
@action({ UUID: 'dev.atlas-vtt.control.roll' })
export class RollAction extends AtlasAction<RollSettings> {
  protected render(settings: RollSettings): string {
    const roll = this.atlas.state?.rolls?.find((one) => one.id === settings.rollId) ?? null;
    return rollKey({ roll, chosen: settings.rollId !== undefined, link: this.atlas.link });
  }

  protected press(settings: RollSettings): Promise<CommandResult> {
    if (!settings.rollId) return Promise.resolve('refused');
    return this.atlas.send({ type: 'roll', id: settings.rollId });
  }
}
