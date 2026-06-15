export type DeveloperSpriteState =
  | "idle"
  | "working"
  | "tired"
  | "worried"
  | "thinking"
  | "resting"
  | "celebrating";

export const levelAssets = {
  level1Base:      new URL("../../../assets/level1.png",                    import.meta.url).href,
  level1BaseClean: new URL("../../../assets/level1_garage_base_clean.png",  import.meta.url).href,
} as const;

export const garageAssets = {
  developerIdle:        new URL("../../../assets/transparent_png/character/dev_idle.png",        import.meta.url).href,
  developerWorking1:    new URL("../../../assets/transparent_png/character/dev_working_1.png",   import.meta.url).href,
  developerWorking2:    new URL("../../../assets/transparent_png/character/dev_working_2.png",   import.meta.url).href,
  developerWorkingAlt:  new URL("../../../assets/transparent_png/character/dev_working_alt.png", import.meta.url).href,
  developerTired:       new URL("../../../assets/transparent_png/character/dev_tired.png",       import.meta.url).href,
  developerWorried:     new URL("../../../assets/transparent_png/character/dev_worried.png",     import.meta.url).href,
  developerThinking:    new URL("../../../assets/transparent_png/character/dev_thinking.png",    import.meta.url).href,
  developerResting:     new URL("../../../assets/transparent_png/character/dev_resting.png",     import.meta.url).href,
  developerCelebrate:   new URL("../../../assets/transparent_png/character/dev_celebrate.png",   import.meta.url).href,
} as const;

// Scene coordinate space matches the level1 image at native resolution ratio (11:8)
export const PNG_SCENE_WIDTH  = 1100;
export const PNG_SCENE_HEIGHT = 800;

export function getDeveloperSprite(state: DeveloperSpriteState, frame = 0) {
  if (state === "working") {
    return frame % 2 === 0 ? garageAssets.developerWorking1 : garageAssets.developerWorking2;
  }
  if (state === "tired")      return garageAssets.developerTired;
  if (state === "worried")    return garageAssets.developerWorried;
  if (state === "thinking")   return garageAssets.developerThinking;
  if (state === "resting")    return garageAssets.developerResting;
  if (state === "celebrating") return garageAssets.developerCelebrate;
  return garageAssets.developerIdle;
}
