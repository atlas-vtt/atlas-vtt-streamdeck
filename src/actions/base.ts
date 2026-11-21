import type { JsonObject } from '@elgato/utils';
import { SingletonAction, type Action, type KeyDownEvent, type DidReceiveSettingsEvent, type WillAppearEvent, type WillDisappearEvent } from '@elgato/streamdeck';
import type { AtlasConnection, CommandResult } from '../atlas/connection.ts';
import { imageOf } from '../render/keys.ts';

/**
 * What every Atlas action shares: it remembers each visible instance's settings, draws all of them again
 * whenever Atlas says something changed (setting an image only where it differs), and answers a press
 * Atlas could not take with Stream Deck's alert.
 */
export abstract class AtlasAction<T extends JsonObject> extends SingletonAction<T> {
  private readonly settingsOf = new Map<string, T>();
  private readonly shown = new Map<string, string>();

  constructor(protected readonly atlas: AtlasConnection) {
    super();
    atlas.onChange(() => this.redraw());
  }

  /** The key's image, as SVG markup. */
  protected abstract render(settings: T): string;

  /** What a key press sends. */
  protected abstract press(settings: T): Promise<CommandResult>;

  override onWillAppear(ev: WillAppearEvent<T>): void {
    this.settingsOf.set(ev.action.id, ev.payload.settings);
    this.shown.delete(ev.action.id);
    this.draw(ev.action, ev.payload.settings);
  }

  override onWillDisappear(ev: WillDisappearEvent<T>): void {
    this.settingsOf.delete(ev.action.id);
    this.shown.delete(ev.action.id);
  }

  override onDidReceiveSettings(ev: DidReceiveSettingsEvent<T>): void {
    this.settingsOf.set(ev.action.id, ev.payload.settings);
    this.draw(ev.action, ev.payload.settings);
  }

  override async onKeyDown(ev: KeyDownEvent<T>): Promise<void> {
    await this.answer(ev.action, await this.press(ev.payload.settings));
  }

  protected settings(id: string): T {
    return this.settingsOf.get(id) ?? ({} as T);
  }

  protected async answer(action: Action<T>, result: CommandResult): Promise<void> {
    if (result !== 'ok' && (action.isKey() || action.isDial())) await action.showAlert();
  }

  protected redraw(): void {
    for (const action of this.actions) this.draw(action as Action<T>, this.settings(action.id));
  }

  protected draw(action: Action<T>, settings: T): void {
    if (!action.isKey()) return;
    const image = imageOf(this.render(settings));
    if (this.shown.get(action.id) === image) return;
    this.shown.set(action.id, image);
    void action.setImage(image).catch(() => this.shown.delete(action.id));
  }
}
