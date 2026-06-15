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

export const garageAssets = {
  base: new URL("../../../assets/transparent_png/environment/base_garage.png", import.meta.url).href,
  rug: new URL("../../../assets/transparent_png/environment/rug.png", import.meta.url).href,
  deskComputer: new URL("../../../assets/transparent_png/environment/desk_computer.png", import.meta.url).href,
  developerIdle: new URL("../../../assets/transparent_png/character/dev_idle.png", import.meta.url).href,
  developerWorking1: new URL("../../../assets/transparent_png/character/dev_working_1.png", import.meta.url).href,
  developerWorking2: new URL("../../../assets/transparent_png/character/dev_working_2.png", import.meta.url).href,
  developerWorkingAlt: new URL("../../../assets/transparent_png/character/dev_working_alt.png", import.meta.url).href,
  developerTired: new URL("../../../assets/transparent_png/character/dev_tired.png", import.meta.url).href,
  developerWorried: new URL("../../../assets/transparent_png/character/dev_worried.png", import.meta.url).href,
  developerThinking: new URL("../../../assets/transparent_png/character/dev_thinking.png", import.meta.url).href,
  developerResting: new URL("../../../assets/transparent_png/character/dev_resting.png", import.meta.url).href,
  developerCelebrate: new URL("../../../assets/transparent_png/character/dev_celebrate.png", import.meta.url).href,
  bookshelf: new URL("../../../assets/transparent_png/environment/bookshelf_upgrades.png", import.meta.url).href,
  coffeeStation: new URL("../../../assets/transparent_png/environment/coffee_station.png", import.meta.url).href,
  storage: new URL("../../../assets/transparent_png/environment/storage_boxes_plans.png", import.meta.url).href,
  plant: new URL("../../../assets/transparent_png/environment/plant.png", import.meta.url).href,
  poster: new URL("../../../assets/transparent_png/environment/wall_poster_controller.png", import.meta.url).href,
} as const;

export const PNG_SCENE_WIDTH = 1760;
export const PNG_SCENE_HEIGHT = 990;

export const pngSceneLayers: PngSceneLayer[] = [
  { id: "base",        asset: garageAssets.base,        alt: "Isometric garage room",        x: 420, y: 120, width: 900, z: 0 },
  { id: "bookshelf",   asset: garageAssets.bookshelf,   alt: "Upgrade bookshelf",            x: 1190, y: 270, width: 220, z: 2 },
  { id: "deskComputer",asset: garageAssets.deskComputer,alt: "Desk with retro computer",     x: 710, y: 360, width: 340, z: 3 },
];

export const developerLayerBase = {
  x: 845,
  y: 455,
  width: 170,
  z: 4,
};

export const developerCelebrateLayer = {
  x: 815,
  y: 420,
  width: 210,
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
