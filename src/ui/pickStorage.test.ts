import { afterEach, expect, it, vi } from "vitest";
import { PersistentStore, type NativePreferences } from "./persistentStore";
import { PICK_STORAGE_KEYS, PICK_PREFERENCES_KEY, PICK_RECORDS_STORAGE_KEY } from "./pickStorage";
import { validatePickSave } from "./pickSaveValidation";

const preferences = JSON.stringify({musicOn:false,soundOn:true,hapticsOn:false,tutorialDone:true});
const records = JSON.stringify({version:1,bestByKey:{
  "unit:tepee:9":{mode:"unit",won:true,elapsedMs:6600,mistakes:0,found:9,total:9,stage:1,score:1500,characterId:"tepee"},
  memory:{mode:"memory",won:true,elapsedMs:80000,mistakes:2,found:24,total:24,stage:4,score:5000},
  "memory:2x2-4x4-6x6":{mode:"memory",memoryVersion:2,won:true,elapsedMs:40000,mistakes:0,found:18,total:18,stage:3,score:6000},
}});
function fixture() {
  const web=new Map([[PICK_PREFERENCES_KEY,preferences],[PICK_RECORDS_STORAGE_KEY,records]]);
  const native=new Map<string,string>();
  const browser={getItem:(key:string)=>web.get(key)??null,setItem:(key:string,value:string)=>{web.set(key,value);}};
  const bridge:NativePreferences={get:async({key})=>({value:native.get(key)??null}),set:async({key,value})=>{native.set(key,value);}};
  return {web,native,browser,bridge};
}
afterEach(()=>{vi.unstubAllGlobals();vi.doUnmock("@capacitor/core");vi.doUnmock("@capacitor/preferences");vi.resetModules();});

it("keeps exact established keys, legacy records and tutorial settings during native migration and reinitialization",async()=>{
  expect(PICK_STORAGE_KEYS).toEqual(["taptopick.preferences.v1","taptopick.records.v1"]);
  const f=fixture();const store=new PersistentStore(()=>f.browser,f.bridge);
  await store.initialize(PICK_STORAGE_KEYS,validatePickSave);
  for(const key of PICK_STORAGE_KEYS){expect(store.read(key)).toBe(f.web.get(key));expect(f.native.get(key)).toBe(f.web.get(key));}
  const newer=JSON.stringify({musicOn:true,soundOn:true,hapticsOn:false,tutorialDone:true});
  store.write(PICK_PREFERENCES_KEY,newer);
  expect(store.hasPendingWrites).toBe(true);expect(store.hasSaveFailure).toBe(false);
  await store.flush();
  const reopened=new PersistentStore(()=>f.browser,f.bridge);await reopened.initialize(PICK_STORAGE_KEYS,validatePickSave);
  expect(reopened.read(PICK_PREFERENCES_KEY)).toBe(newer);
  expect(f.web.get(PICK_PREFERENCES_KEY)).toBe(preferences);
  expect(reopened.read(PICK_RECORDS_STORAGE_KEY)).toBe(records);
});
it("does not read or overwrite defaults before all delayed native reads finish",async()=>{
  const f=fixture();let release!:()=>void;
  const get=f.bridge.get;
  f.bridge.get=async opts=>{if(opts.key===PICK_RECORDS_STORAGE_KEY)await new Promise<void>(r=>{release=r;});return get(opts);};
  const store=new PersistentStore(()=>f.browser,f.bridge);const loading=store.initialize(PICK_STORAGE_KEYS,validatePickSave);
  expect(()=>store.read(PICK_PREFERENCES_KEY)).toThrow();expect(()=>store.write(PICK_PREFERENCES_KEY,"{}")).toThrow();
  expect(f.native.size).toBe(0);release();await loading;expect(store.read(PICK_PREFERENCES_KEY)).toBe(preferences);
});
it("validates every initial key before migrating and preserves damaged sources",async()=>{
  const f=fixture();f.web.set(PICK_RECORDS_STORAGE_KEY,'{"version":1,"bestByKey":{"bad":{}}}');
  const store=new PersistentStore(()=>f.browser,f.bridge);
  await expect(store.initialize(PICK_STORAGE_KEYS,validatePickSave)).rejects.toThrow();
  expect(f.native.size).toBe(0);expect(f.web.get(PICK_PREFERENCES_KEY)).toBe(preferences);
});
it("can recover the original WebView backup without deleting a damaged legacy primary",async()=>{
  const f=fixture();f.web.set(PICK_RECORDS_STORAGE_KEY,"broken");f.web.set(PICK_RECORDS_STORAGE_KEY+".backup",records);
  const store=new PersistentStore(()=>f.browser,f.bridge);await store.initialize(PICK_STORAGE_KEYS,validatePickSave);
  expect(f.native.get(PICK_RECORDS_STORAGE_KEY)).toBe(records);expect(f.web.get(PICK_RECORDS_STORAGE_KEY)).toBe("broken");
});
it("recovers interrupted migration from native backup and ignores stale WebView data",async()=>{
  const f=fixture();let fail=true;const set=f.bridge.set;
  f.bridge.set=async opts=>{if(opts.key===PICK_RECORDS_STORAGE_KEY&&fail)throw Error("disk");await set(opts);};
  const store=new PersistentStore(()=>f.browser,f.bridge);await expect(store.initialize(PICK_STORAGE_KEYS,validatePickSave)).rejects.toThrow();
  expect(f.native.get(PICK_RECORDS_STORAGE_KEY+".backup")).toBe(records);
  f.web.set(PICK_RECORDS_STORAGE_KEY,'{"version":1,"bestByKey":{}}');fail=false;
  await store.initialize(PICK_STORAGE_KEYS,validatePickSave);expect(store.read(PICK_RECORDS_STORAGE_KEY)).toBe(records);
});
it.each(['{"musicOn":"false"}','{"soundOn":0}','[]','null'])("rejects bad preference schema %s",raw=>{
  expect(()=>validatePickSave(PICK_PREFERENCES_KEY,raw)).toThrow();
});
it("rejects bad writes before modifying either storage or memory",async()=>{
  const f=fixture();const store=new PersistentStore(()=>f.browser);await store.initialize(PICK_STORAGE_KEYS,validatePickSave);
  expect(()=>store.write(PICK_PREFERENCES_KEY,'{"musicOn":42}')).toThrow();
  expect(()=>store.write("unknown","{}")).toThrow();expect(store.read(PICK_PREFERENCES_KEY)).toBe(preferences);
});
it("uses the native adapter for real preferences/results without treating pending saves as failures",async()=>{
  vi.resetModules();const f=fixture();
  vi.stubGlobal("localStorage",f.browser);
  vi.doMock("@capacitor/core",()=>({Capacitor:{isNativePlatform:()=>true}}));
  vi.doMock("@capacitor/preferences",()=>({Preferences:f.bridge}));
  const {pickStore,PICK_STORAGE_KEYS}=await import("./pickStorage");
  const {validatePickSave}=await import("./pickSaveValidation");
  await pickStore.initialize(PICK_STORAGE_KEYS,validatePickSave);
  const {loadTalkPreferences,saveTalkPreferences}=await import("./talkPreferences");
  expect(loadTalkPreferences()).toEqual(JSON.parse(preferences));
  saveTalkPreferences({...loadTalkPreferences(),musicOn:true});
  const {savePickResult}=await import("./pickRecords");
  const result=savePickResult({...JSON.parse(records).bestByKey["unit:tepee:9"],elapsedMs:6000});
  expect(result.storageAvailable).toBe(true);await pickStore.flush();
  expect(JSON.parse(f.native.get(PICK_RECORDS_STORAGE_KEY)!).bestByKey["unit:tepee:9"].elapsedMs).toBe(6000);
  expect(f.web.get(PICK_RECORDS_STORAGE_KEY)).toBe(records);expect(JSON.parse(f.native.get(PICK_PREFERENCES_KEY)!).musicOn).toBe(true);
});
