import sharp from "sharp";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "../..");
const SRC = path.join(ROOT, "attached_assets");
const DEST = path.join(ROOT, "artifacts/garage-scene/public/character");
const FRAME = 512;

function colBounds(total: number, n: number) {
  return Array.from({ length: n }, (_, i) => ({
    left: Math.round((i * total) / n),
    width: Math.round(((i + 1) * total) / n) - Math.round((i * total) / n),
  }));
}
function rowBounds(total: number, n: number) {
  return Array.from({ length: n }, (_, i) => ({
    top: Math.round((i * total) / n),
    height: Math.round(((i + 1) * total) / n) - Math.round((i * total) / n),
  }));
}

async function slice(
  srcFile: string,
  outDir: string,
  cols: number,
  rows: number,
  names: string[]
) {
  fs.mkdirSync(outDir, { recursive: true });
  const src = sharp(srcFile).ensureAlpha();
  const W = 1254, H = 1254;
  const cs = colBounds(W, cols);
  const rs = rowBounds(H, rows);
  let idx = 0;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const name = names[idx++];
      if (!name) continue;
      const outPath = path.join(outDir, `${name}.png`);
      await sharp(srcFile)
        .ensureAlpha()
        .extract({ left: cs[c].left, top: rs[r].top, width: cs[c].width, height: rs[r].height })
        .resize(FRAME, FRAME, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
        .toFile(outPath);
      console.log(`  ✓ ${outPath.replace(ROOT + "/", "")}`);
    }
  }
}

async function main() {
  console.log("Slicing character sprite sheets → 512×512 PNGs\n");

  // ── CHAIR  (3 cols × 2 rows) ──────────────────────────────────────────────
  console.log("Chair:");
  await slice(
    path.join(SRC, "chair_1781543825085.png"),
    path.join(DEST, "chair"),
    3, 2,
    [
      "chair_black", "chair_gray",  "chair_blue",
      "chair_beige", "chair_red",   "chair_green",
    ]
  );

  // ── CLOTHING  (4 cols × 2 rows) ───────────────────────────────────────────
  console.log("\nClothing:");
  await slice(
    path.join(SRC, "clothing_1781543825085.png"),
    path.join(DEST, "clothing"),
    4, 2,
    [
      "hoodie_teal",   "jacket_dark", "vest_stripe", "sweater_red",
      "shirt_beige",   "cardigan_green", "hoodie_black", "tshirt_beige",
    ]
  );

  // ── HAIR  (4 cols × 2 rows) ───────────────────────────────────────────────
  console.log("\nHair:");
  await slice(
    path.join(SRC, "hair_1781543825086.png"),
    path.join(DEST, "hair"),
    4, 2,
    [
      "hair_brown_01", "hair_black_01", "hair_blond_01", "hair_red_01",
      "hair_green_01", "hair_green_02", "hair_brown_02", "hair_brown_03",
    ]
  );

  // ── SKIN / HANDS  (3 cols × 6 rows) ──────────────────────────────────────
  // Col 0 = head, Col 1 = grabbing hand, Col 2 = fist/arm
  // Rows 0-5 = tone 1 (lightest) → tone 6 (darkest)
  console.log("\nSkin + Hands:");
  const tones = ["tone1","tone2","tone3","tone4","tone5","tone6"];
  const skinNames: string[] = [];
  for (const t of tones) skinNames.push(`head_${t}`, `hand_grab_${t}`, `hand_fist_${t}`);

  const skinSrc = path.join(SRC, "skin_1781543825086.png");
  const W = 1254, H = 1254;
  const cs = colBounds(W, 3);
  const rs = rowBounds(H, 6);

  let idx = 0;
  for (let r = 0; r < 6; r++) {
    for (let c = 0; c < 3; c++) {
      const name = skinNames[idx++];
      const outDir = c === 0 ? path.join(DEST, "skin") : path.join(DEST, "hands");
      fs.mkdirSync(outDir, { recursive: true });
      const outPath = path.join(outDir, `${name}.png`);
      await sharp(skinSrc)
        .ensureAlpha()
        .extract({ left: cs[c].left, top: rs[r].top, width: cs[c].width, height: rs[r].height })
        .resize(FRAME, FRAME, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
        .toFile(outPath);
      console.log(`  ✓ ${outPath.replace(ROOT + "/", "")}`);
    }
  }

  console.log("\nDone.");
}

main().catch(err => { console.error(err); process.exit(1); });
