/** Stable keys survive app releases. Native Preferences becomes authoritative after migration. */
export interface NativePreferences {
  get(options: { key: string }): Promise<{ value: string | null }>;
  set(options: { key: string; value: string }): Promise<void>;
}
type BrowserStorage = Pick<Storage, "getItem" | "setItem">;
export function savedObject(raw: string): Record<string, unknown> {
  const value: unknown = JSON.parse(raw);
  if (!value || typeof value !== "object" || Array.isArray(value)) throw Error("Invalid saved data");
  return value as Record<string, unknown>;
}

export class PersistentStore {
  private ready = false;
  private starting?: Promise<void>;
  private writing?: Promise<void>;
  private readonly values = new Map<string, string | null>();
  private readonly persisted = new Map<string, string | null>();
  private readonly pending = new Map<string, string>();
  private saveFailed = false;
  get hasSaveFailure(): boolean { return this.saveFailed; }
  private validate: (key: string, raw: string) => void = (_key, raw) => { savedObject(raw); };
  get hasPendingWrites(): boolean { return this.pending.size > 0; }
  onSaveFailure: (failed: boolean) => void = () => {};
  private reportSaveFailure(failed: boolean): void {
    this.saveFailed = failed;
    this.onSaveFailure(failed);
  }
  constructor(private readonly browser: () => BrowserStorage, private readonly native?: NativePreferences) {}

  initialize(keys: readonly string[], validate: (key: string, raw: string) => void = (_key, raw) => { savedObject(raw); }): Promise<void> {
    if (this.ready) return Promise.resolve();
    if (this.starting) return this.starting;
    this.starting = this.hydrate(keys, validate).finally(() => { this.starting = undefined; });
    return this.starting;
  }
  private async get(key: string): Promise<string | null> {
    return this.native ? (await this.native.get({ key })).value : this.browser().getItem(key);
  }
  private async set(key: string, value: string): Promise<void> {
    if (this.native) await this.native.set({ key, value });
    else this.browser().setItem(key, value);
  }
  private async hydrate(keys: readonly string[], validate: (key: string, raw: string) => void): Promise<void> {
    // Validate every key before writing any defaults/migrations. Read failures are
    // NOT first installs. Keep unrecoverable data intact for retry/recovery.
    const entries = await Promise.all(keys.map(async key => {
      const original = await this.get(key);
      let value = original;
      if (original !== null) {
        try { validate(key, original); }
        catch (error) {
          value = await this.get(`${key}.backup`);
          if (value === null) throw error;
          validate(key, value);
        }
      } else {
        value = await this.get(`${key}.backup`);
        if (value !== null) validate(key, value);
        else if (this.native) {
          value = this.browser().getItem(key);
          if (value !== null) {
            try { validate(key, value); }
            catch (error) {
              value = this.browser().getItem(`${key}.backup`);
              if (value === null) throw error;
              validate(key, value);
            }
          } else {
            value = this.browser().getItem(`${key}.backup`);
            if (value !== null) validate(key, value);
          }
        }
      }
      return { key, value, restore: value !== original };
    }));
    for (const { key, value, restore } of entries) {
      if (restore && value !== null) {
        await this.set(`${key}.backup`, value);
        await this.set(key, value);
      }
      this.values.set(key, value);
      this.persisted.set(key, value);
    }
    this.validate = validate;
    this.ready = true;
  }
  read(key: string): string | null {
    if (!this.ready) throw Error("Load saved progress before starting");
    return this.values.get(key) ?? null;
  }
  write(key: string, value: string): void {
    if (!this.ready) throw Error("Load saved progress before saving");
    if (!this.values.has(key)) throw Error("Unknown storage key");
    this.validate(key, value);
    if (this.values.get(key) === value && !this.pending.has(key)) return;
    this.values.set(key, value);
    this.pending.set(key, value);
    if (this.native) void this.flush().catch(() => {});
    else {
      // Browser writes remain synchronous, including pagehide. Native writes are
      // serialized below so a slow old save cannot overwrite the latest stage.
      try { this.writeBrowser(key, value); this.reportSaveFailure(this.pending.size > 0); }
      catch { this.reportSaveFailure(true); }
    }
  }
  private writeBrowser(key: string, value: string): void {
    const previous = this.persisted.get(key);
    this.browser().setItem(`${key}.backup`, previous ?? value);
    this.browser().setItem(key, value);
    this.persisted.set(key, value);
    if (this.pending.get(key) === value) this.pending.delete(key);
  }
  flush(): Promise<void> {
    if (this.writing) return this.writing;
    this.writing = this.drain().then(() => {
      this.writing = undefined;
      // A write may arrive after drain resolves but before this microtask runs.
      if (this.pending.size) return this.flush();
    }, error => { this.writing = undefined; throw error; });
    return this.writing;
  }
  private async drain(): Promise<void> {
    try {
      while (this.pending.size) for (const [key, value] of [...this.pending]) {
        if (this.native) {
          await this.set(`${key}.backup`, this.persisted.get(key) ?? value);
          await this.set(key, value);
          this.persisted.set(key, value);
          if (this.pending.get(key) === value) this.pending.delete(key);
        } else this.writeBrowser(key, value);
      }
      this.reportSaveFailure(false);
    } catch (error) { this.reportSaveFailure(true); throw error; }
  }
}
