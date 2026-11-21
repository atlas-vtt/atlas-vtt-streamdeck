import { action } from '@elgato/streamdeck';
import type { JsonObject } from '@elgato/utils';
import type { AtlasConnection, CommandResult } from '../atlas/connection.ts';
import { controlKey } from '../render/keys.ts';
import { AtlasAction } from './base.ts';
import type { ControlSpec } from './controlSpecs.ts';

/** One action class per control, each with its own manifest UUID. */
export function controlAction(spec: ControlSpec, atlas: AtlasConnection): AtlasAction<JsonObject> {
  @action({ UUID: spec.uuid })
  class Control extends AtlasAction<JsonObject> {
    protected render(): string {
      return controlKey({ ...spec.look(this.atlas.state, this.atlas.moods), link: this.atlas.link });
    }

    protected press(): Promise<CommandResult> {
      return this.atlas.send(spec.command);
    }
  }
  return new Control(atlas);
}
