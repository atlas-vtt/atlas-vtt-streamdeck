import { action, type Action, type DialDownEvent, type DialRotateEvent, type FeedbackPayload, type TouchTapEvent } from '@elgato/streamdeck';
import type { CommandResult } from '../atlas/connection.ts';
import { CHANNEL_NAMES, channelOf, levelOf, stepOf, type VolumeSettings } from './levels.ts';
import { formatDb, glyphIcon, imageOf, levelKey, levelShare } from '../render/keys.ts';
import { AtlasAction } from './base.ts';

/**
 * A level: on a key, each press moves it by its step; on a Stream Deck + dial, each notch moves it and a push
 * or a tap on the touch strip puts it back to 0 dB, with the level and a bar on the strip.
 */
@action({ UUID: 'dev.atlas-vtt.control.volume' })
export class VolumeAction extends AtlasAction<VolumeSettings> {
  protected render(settings: VolumeSettings): string {
    const channel = channelOf(settings);
    const step = stepOf(settings, false);
    return levelKey({ label: CHANNEL_NAMES[channel], ...levelOf(this.atlas.state, channel), step: step === 0 ? '0 dB' : formatDb(step), link: this.atlas.link });
  }

  protected press(settings: VolumeSettings): Promise<CommandResult> {
    const step = stepOf(settings, false);
    const channel = channelOf(settings);
    return this.atlas.send(step === 0 ? { type: 'level', channel, reset: true } : { type: 'level', channel, deltaDb: step });
  }

  override async onDialRotate(ev: DialRotateEvent<VolumeSettings>): Promise<void> {
    const deltaDb = ev.payload.ticks * stepOf(ev.payload.settings, true);
    await this.answer(ev.action, await this.atlas.send({ type: 'level', channel: channelOf(ev.payload.settings), deltaDb }));
  }

  override async onDialDown(ev: DialDownEvent<VolumeSettings>): Promise<void> {
    await this.answer(ev.action, await this.atlas.send({ type: 'level', channel: channelOf(ev.payload.settings), reset: true }));
  }

  override async onTouchTap(ev: TouchTapEvent<VolumeSettings>): Promise<void> {
    await this.answer(ev.action, await this.atlas.send({ type: 'level', channel: channelOf(ev.payload.settings), reset: true }));
  }

  protected override draw(action: Action<VolumeSettings>, settings: VolumeSettings): void {
    if (!action.isDial()) {
      super.draw(action, settings);
      return;
    }
    const channel = channelOf(settings);
    const { db, range } = levelOf(this.atlas.state, channel);
    const offline = this.atlas.link !== 'connected';
    const feedback: FeedbackPayload = {
      title: CHANNEL_NAMES[channel],
      value: offline ? (this.atlas.link === 'offline' ? 'Offline' : 'Not paired') : db === null ? '–' : formatDb(db),
      indicator: { value: db === null || offline ? 0 : Math.round(levelShare(db, range) * 100), opacity: offline ? 0.3 : 1 },
      icon: imageOf(glyphIcon(db !== null && db <= range[0] ? 'volumeMuted' : 'volume')),
    };
    if (!this.changed(action.id, JSON.stringify(feedback))) return;
    void action.setFeedback(feedback).catch(() => this.forget(action.id));
  }
}
