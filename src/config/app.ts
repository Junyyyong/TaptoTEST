const CELEBRATION_MOVIES = [
  {
    video: new URL("../../movie/1.webm", import.meta.url).href,
    iosVideo: new URL("../../movie/1.mp4", import.meta.url).href,
    sound: new URL("../../movie/1.mp3", import.meta.url).href,
  },
  {
    video: new URL("../../movie/4.webm", import.meta.url).href,
    iosVideo: new URL("../../movie/4.mp4", import.meta.url).href,
    sound: new URL("../../movie/4.mp3", import.meta.url).href,
  },
  {
    video: new URL("../../Unbelievable.webm", import.meta.url).href,
    iosVideo: new URL("../../Unbelievable.mp4", import.meta.url).href,
    sound: new URL("../../Unbelievable.mp3", import.meta.url).href,
  },
  {
    video: new URL("../../movie/hupi.webm", import.meta.url).href,
    iosVideo: new URL("../../movie/hupi.mp4", import.meta.url).href,
    sound: new URL("../../movie/hupi.mp3", import.meta.url).href,
  },
  {
    video: new URL("../../movie/haepi.webm", import.meta.url).href,
    iosVideo: new URL("../../movie/haepi.mp4", import.meta.url).href,
    sound: new URL("../../movie/haepi.mp3", import.meta.url).href,
  },
  {
    video: new URL("../../movie/jaepi.webm", import.meta.url).href,
    iosVideo: new URL("../../movie/jaepi.mp4", import.meta.url).href,
    sound: new URL("../../movie/jaepi.mp3", import.meta.url).href,
  },
] as const;

const TIPI_MOVIE = {
  video: new URL("../../movie/tipi.webm", import.meta.url).href,
  iosVideo: new URL("../../movie/tipi.mp4", import.meta.url).href,
  sound: new URL("../../movie/tipi.mp3", import.meta.url).href,
} as const;

const FAILURE_MOVIE = {
  video: new URL("../../movie/notbad.webm", import.meta.url).href,
  iosVideo: new URL("../../movie/notbad.mp4", import.meta.url).href,
  sound: new URL("../../movie/notbad.mp3", import.meta.url).href,
  layout: "compact",
} as const;

const CHARACTER_CELEBRATIONS = {
  bb: CELEBRATION_MOVIES[0],
  bbogles: CELEBRATION_MOVIES[0],
  pino: CELEBRATION_MOVIES[1],
  tapee: CELEBRATION_MOVIES[2],
  hoo: CELEBRATION_MOVIES[3],
  hupi: CELEBRATION_MOVIES[3],
  ha: CELEBRATION_MOVIES[4],
  haepi: CELEBRATION_MOVIES[4],
  ja: CELEBRATION_MOVIES[5],
  jaepi: CELEBRATION_MOVIES[5],
  tepee: TIPI_MOVIE,
} as const;

/**
 * Product copy and replaceable media live here, away from game rules and UI.
 * Keep the public paths stable and a redesign only needs new asset files.
 */
export const APP_CONFIG = {
  name: "TAPtoTEST",
  board: { columns: 7, rows: 7 },
  timing: { studioSplashMs: 1_800, productSplashMs: 4_000 },
  assets: {
    // Separate scene tracks; each is downloaded only when it first plays.
    backgroundMusic: new URL("../../public/assets/audio/pick-garden.mp3", import.meta.url).href,
    menuMusic: new URL("../../public/assets/audio/pick-tap-lobby.mp3", import.meta.url).href,
    studioSplash: new URL("../../public/assets/brand/tapeetepee-open2-06.png", import.meta.url).href,
    productCover: new URL("../../public/assets/brand/taptopick-cover-0911-01-v2.webp", import.meta.url).href,
    productLogo: new URL("../../public/assets/brand/TAPtoPICK-logo-0911-01-v2.webp", import.meta.url).href,
    celebrationVideo: CELEBRATION_MOVIES[0]!.video,
    celebrationAudio: CELEBRATION_MOVIES[0]!.sound,
    failureCelebration: FAILURE_MOVIE,
    recordCelebration: {
      video: new URL("../../OH MY GOD.webm", import.meta.url).href,
      iosVideo: new URL("../../OH MY GOD.mp4", import.meta.url).href,
      sound: new URL("../../OH MY GOD.mp3", import.meta.url).href,
      layout: "hero",
    },
    characterCelebrations: CHARACTER_CELEBRATIONS,
    celebrations: [
      { at: 1400, layout: "hero", clips: CELEBRATION_MOVIES },
      { at: 1000, layout: "hero", clips: CELEBRATION_MOVIES },
      { at: 600, layout: "large", clips: CELEBRATION_MOVIES },
      { at: 300, layout: "standard", clips: CELEBRATION_MOVIES },
      { at: 0, layout: "compact", clips: CELEBRATION_MOVIES },
    ],
  },
} as const;
