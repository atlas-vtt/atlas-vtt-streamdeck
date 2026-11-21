import { action } from '@elgato/streamdeck';
import type { CommandResult } from '../atlas/connection.ts';
import { moodKey } from '../render/keys.ts';
import { AtlasAction } from './base.ts';

export type MoodSettings = { moodId?: string };

/** Plays a mood. The key shows its crest, tone and name, and lights up while that mood plays. */
@action({ UUID: 'dev.atlas-vtt.sound.mood' })
export class MoodAction extends AtlasAction<MoodSettings> {
  protected render(settings: MoodSettings): string {
    const mood = this.atlas.moods.find((one) => one.id === settings.moodId) ?? null;
    const active = mood !== null && this.atlas.state?.mood === mood.id && this.atlas.state.playing;
    return moodKey({ mood, active, link: this.atlas.link });
  }

  protected press(settings: MoodSettings): Promise<CommandResult> {
    if (!settings.moodId) return Promise.resolve('refused');
    return this.atlas.send({ type: 'mood', id: settings.moodId });
  }
}
