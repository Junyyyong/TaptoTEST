import "./ui/styles/index.css";
import { APP_CONFIG } from "./config/app";
import { GAME_IMAGE_URLS } from "./content/puzzles";
import { preloadImages } from "./ui/imagePreloader";
import { TalkApp } from "./ui/talkApp";
import { trackViewport } from "./ui/viewport";
import { trackNativeFrame } from "./ui/nativeFrame";
import { Capacitor } from "@capacitor/core";
import { PICK_STORAGE_KEYS, pickStore } from "./ui/pickStorage";
import { validatePickSave } from "./ui/pickSaveValidation";
import { StorageNotice } from "./ui/storageNotice";
import "./ui/styles/storage.css";
import "./ui/styles/neutralUi.css";

document.title = APP_CONFIG.name;
const studioSplash = document.querySelector<HTMLImageElement>(".studio-splash-cover");
if (studioSplash) studioSplash.src = APP_CONFIG.assets.studioSplash;
const productCover = document.querySelector<HTMLImageElement>("#product-cover");
if (productCover) productCover.src = APP_CONFIG.assets.productCover;
const productLogo = document.querySelector<HTMLImageElement>("#brand-mark");
if (productLogo) productLogo.src = APP_CONFIG.assets.productLogo;
trackViewport();
trackNativeFrame(Capacitor.getPlatform() === "android");
const storageNotice = new StorageNotice();
pickStore.onSaveFailure = failed => failed
  ? storageNotice.show(false, () => pickStore.flush()) : storageNotice.hide();
let started = false;
async function start(): Promise<void> {
  if (started) return;
  try { await pickStore.initialize(PICK_STORAGE_KEYS, validatePickSave); }
  catch { storageNotice.show(true, start); return; }
  if (started) return;
  started = true;
  storageNotice.hide();
  new TalkApp();
  const flush = () => { void pickStore.flush().catch(() => {}); };
  document.addEventListener("visibilitychange", flush);
  window.addEventListener("pagehide", flush);
  window.addEventListener("focus", flush);
}
void start();

const warmGameImages = (): void => { void preloadImages(GAME_IMAGE_URLS); };
if (document.readyState === "complete") warmGameImages();
else window.addEventListener("load", warmGameImages, { once: true });
