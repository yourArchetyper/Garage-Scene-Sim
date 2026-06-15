export type DeveloperSpriteState =
  | "idle"
  | "working"
  | "tired"
  | "worried"
  | "thinking"
  | "resting"
  | "celebrating";

export type PngSceneLayer = {
  id: string;
  asset: string;
  alt: string;
  x: number;
  y: number;
  width: number;
  z: number;
  optional?: boolean;
};

export const levelAssets = {
  level1Base: new URL("../../../assets/level1.png", import.meta.url).href,
} as const;

export const garageAssets = {
  developerIdle: new URL("../../../assets/transparent_png/character/dev_idle.png", import.meta.url).href,
  developerWorking1: new URL("../../../assets/transparent_png/character/dev_working_1.png", import.meta.url).href,
  developerWorking2: new URL("../../../assets/transparent_png/character/dev_working_2.png", import.meta.url).href,
  developerWorkingAlt: new URL("../../../assets/transparent_png/character/dev_working_alt.png", import.meta.url).href,
  developerTired: new URL("../../../assets/transparent_png/character/dev_tired.png", import.meta.url).href,
  developerWorried: new URL("../../../assets/transparent_png/character/dev_worried.png", import.meta.url).href,
  developerThinking: new URL("../../../assets/transparent_png/character/dev_thinking.png", import.meta.url).href,
  developerResting: new URL("../../../assets/transparent_png/character/dev_resting.png", import.meta.url).href,
  developerCelebrate: new URL("../../../assets/transparent_png/character/dev_celebrate.png", import.meta.url).href,
} as const;

export const PNG_SCENE_WIDTH = 1448;
export const PNG_SCENE_HEIGHT = 1086;

export const pngSceneLayers: PngSceneLayer[] = [
  {
    id: "level1Base",
    asset: levelAssets.level1Base,
    alt: "Isometric garage room – Level 1",
    x: 0,
    y: 0,
    width: PNG_SCENE_WIDTH,
    z: 0,
  },
];

export const developerLayerBase = {
  x: 870,
  y: 530,
  width: 155,
  z: 4,
};

export const developerCelebrateLayer = {
  x: 840,
  y: 495,
  width: 195,
  z: 4,
};

export function getDeveloperSprite(state: DeveloperSpriteState, frame = 0) {
  if (state === "working") {
    return frame % 2 === 0 ? garageAssets.developerWorking1 : garageAssets.developerWorking2;
  }
  if (state === "tired") return garageAssets.developerTired;
  if (state === "worried") return garageAssets.developerWorried;
  if (state === "thinking") return garageAssets.developerThinking;
  if (state === "resting") return garageAssets.developerResting;
  if (state === "celebrating") return garageAssets.developerCelebrate;
  return garageAssets.developerIdle;
}
