import assert from "node:assert/strict";

import {
  garageAssets,
  getDeveloperSprite,
  pngSceneLayers,
  type DeveloperSpriteState,
} from "./sceneAssets.ts";

const expectedAssetKeys = [
  "base",
  "rug",
  "deskComputer",
  "developerIdle",
  "developerWorking1",
  "developerWorking2",
  "developerTired",
  "developerWorried",
  "developerThinking",
  "developerResting",
  "developerCelebrate",
  "bookshelf",
  "coffeeStation",
  "storage",
  "plant",
  "poster",
] as const;

for (const key of expectedAssetKeys) {
  assert.match(garageAssets[key], /transparent_png/);
  assert.match(garageAssets[key], /\.png($|\?)/);
}

assert.equal(pngSceneLayers[0].id, "base");
assert.equal(pngSceneLayers[0].asset, garageAssets.base);
assert.ok(pngSceneLayers.every((layer) => layer.width > 0));
assert.ok(pngSceneLayers.every((layer) => layer.z >= 0));

const stateExpectations: [DeveloperSpriteState, number, string][] = [
  ["idle", 0, garageAssets.developerIdle],
  ["working", 0, garageAssets.developerWorking1],
  ["working", 1, garageAssets.developerWorking2],
  ["tired", 0, garageAssets.developerTired],
  ["worried", 0, garageAssets.developerWorried],
  ["thinking", 0, garageAssets.developerThinking],
  ["resting", 0, garageAssets.developerResting],
  ["celebrating", 0, garageAssets.developerCelebrate],
];

for (const [state, frame, expected] of stateExpectations) {
  assert.equal(getDeveloperSprite(state, frame), expected);
}
