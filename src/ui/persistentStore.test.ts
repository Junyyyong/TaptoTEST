import { expect, it, vi } from "vitest";
import { PersistentStore, type NativePreferences } from "./persistentStore";
import { PICK_STORAGE_KEYS } from "./pickStorage";
const KEY = "taptopick.preferences.v1";
const old = '{"stage":10}', next = '{"stage":11}', latest = '{"stage":12}';
function memory(entries: [string, string][] = []) {
  const data = new Map(entries);
  return { data, getItem: vi.fn((key: string) => data.get(key) ?? null), setItem: vi.fn((key: string, value: string) => { data.set(key, value); }) };
}
function native(browser = memory()) {
  const bridge: NativePreferences = { get: async ({key}) => ({value:browser.getItem(key)}), set: async ({key,value}) => { browser.setItem(key,value); } };
  return { ...browser, bridge };
}
it("migrates existing WebView data without deleting it, native wins on later launches", async () => {
  const web=memory([[KEY,old]]), app=native();
  const store=new PersistentStore(()=>web,app.bridge);await store.initialize([KEY]);
  expect(app.data.get(KEY)).toBe(old);expect(web.data.get(KEY)).toBe(old);
  store.write(KEY,next);await store.flush();
  const reopened=new PersistentStore(()=>web,app.bridge);await reopened.initialize([KEY]);
  expect(reopened.read(KEY)).toBe(next);expect(app.data.get(`${KEY}.backup`)).toBe(old);
});
it.each([false,true])("recovers a missing/corrupt primary from backup, native=%s", async useNative => {
  for (const damaged of [null,"{broken"]) {
    const data=memory([[`${KEY}.backup`,old],...(damaged ? [[KEY,damaged] as [string,string]] : [])]);
    const store=new PersistentStore(()=>data,useNative?native(data).bridge:undefined);await store.initialize([KEY]);
    expect(store.read(KEY)).toBe(old);expect(data.data.get(KEY)).toBe(old);
  }
});
it("does not migrate any key when another key cannot be read; Retry can recover", async () => {
  const web=memory([[KEY,old]]), app=native();let failing=true;
  const get=app.bridge.get;app.bridge.get=async options=>{if(options.key==="other"&&failing)throw Error("bridge");return get(options);};
  const store=new PersistentStore(()=>web,app.bridge);
  await expect(store.initialize([KEY,"other"])).rejects.toThrow("bridge");expect(app.setItem).not.toHaveBeenCalled();
  expect(()=>store.read(KEY)).toThrow();expect(()=>store.write(KEY,next)).toThrow();
  failing=false;await store.initialize([KEY,"other"]);expect(store.read(KEY)).toBe(old);
});
it("preserves unrecoverable original data, including valid JSON with a wrong schema", async () => {
  const web=memory([[KEY,old]]), store=new PersistentStore(()=>web);
  await expect(store.initialize([KEY],()=>{throw Error("schema");})).rejects.toThrow("schema");
  expect(web.setItem).not.toHaveBeenCalled();expect(web.data.get(KEY)).toBe(old);
});
it("serializes slow native writes and persists the latest queued stage", async () => {
  const app=native(memory([[KEY,old]]));let release!:()=>void;
  const set=app.bridge.set;app.bridge.set=async options=>{
    if(options.key===KEY&&options.value===next)await new Promise<void>(resolve=>{release=resolve;});
    await set(options);
  };
  const store=new PersistentStore(()=>memory(),app.bridge);await store.initialize([KEY]);store.write(KEY,next);
  await vi.waitFor(()=>expect(release).toBeTypeOf("function"));store.write(KEY,latest);release();await store.flush();
  expect(app.data.get(KEY)).toBe(latest);expect(app.data.get(`${KEY}.backup`)).toBe(next);
});
it.each([false,true])("keeps failed writes queued and retries without losing newer state, native=%s", async useNative => {
  const web=memory([[KEY,old]]);let full=true;const set=web.setItem;
  web.setItem=vi.fn((key,value)=>{if(full)throw Error("quota");set(key,value);});
  const store=new PersistentStore(()=>web,useNative?native(web).bridge:undefined);const notice=vi.fn();store.onSaveFailure=notice;
  await store.initialize([KEY]);store.write(KEY,next);await expect(store.flush()).rejects.toThrow("quota");
  expect(store.read(KEY)).toBe(next);expect(web.data.get(KEY)).toBe(old);expect(notice).toHaveBeenCalledWith(true);
  full=false;await store.flush();expect(web.data.get(KEY)).toBe(next);expect(notice).toHaveBeenLastCalledWith(false);
});
it("native data works without access to browser storage",async()=>{
  const app=native(memory([[KEY,old]]));const store=new PersistentStore(()=>{throw Error("no WebView");},app.bridge);
  await store.initialize([KEY]);expect(store.read(KEY)).toBe(old);
});
it("web writes immediately and keeps a recovery copy even for the first save",async()=>{
  const web=memory(),store=new PersistentStore(()=>web);await store.initialize([KEY]);store.write(KEY,old);
  expect(web.data.get(KEY)).toBe(old);expect(web.data.get(`${KEY}.backup`)).toBe(old);
  store.write(KEY,next);expect(web.data.get(KEY)).toBe(next);expect(web.data.get(`${KEY}.backup`)).toBe(old);
});

it.each([false, true])("a new app instance keeps every stable key and backup untouched, native=%s", async useNative => {
  const entries = PICK_STORAGE_KEYS.flatMap((key, index) => [
    [key, JSON.stringify({ saved: index, version: 1 })] as [string, string],
    [key + ".backup", JSON.stringify({ saved: index - 1, version: 1 })] as [string, string],
  ]);
  const data = memory(entries), app = useNative ? native(data).bridge : undefined;
  for (let launch = 0; launch < 2; launch++) {
    const store = new PersistentStore(() => data, app);
    await store.initialize(PICK_STORAGE_KEYS);
    for (const key of PICK_STORAGE_KEYS) expect(store.read(key)).toBe(data.data.get(key));
    await store.flush();
  }
  expect([...data.data]).toEqual(entries);
  expect(data.setItem).not.toHaveBeenCalled();
});
