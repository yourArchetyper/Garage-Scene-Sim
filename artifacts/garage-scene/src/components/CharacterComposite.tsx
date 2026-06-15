import { CSSProperties, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";

// ── Types ────────────────────────────────────────────────────────────────────

export type SkinTone = "tone1" | "tone2" | "tone3" | "tone4" | "tone5" | "tone6";

export type CharacterCustomization = {
  chair:    "chair_black"|"chair_gray"|"chair_blue"|"chair_beige"|"chair_red"|"chair_green";
  clothing: "hoodie_teal"|"jacket_dark"|"vest_stripe"|"sweater_red"|"shirt_beige"|"cardigan_green"|"hoodie_black"|"tshirt_beige";
  skin:     SkinTone;
  hair:     "hair_brown_01"|"hair_black_01"|"hair_blond_01"|"hair_red_01"|"hair_green_01"|"hair_green_02"|"hair_brown_02"|"hair_brown_03";
};

export const DEFAULT_CUSTOMIZATION: CharacterCustomization = {
  chair:    "chair_black",
  clothing: "hoodie_teal",
  skin:     "tone1",
  hair:     "hair_brown_01",
};

export type CharWorkState = "idle" | "working" | "tired" | "celebrating";

// ── Asset URL helpers ────────────────────────────────────────────────────────

const BASE = "/character";

function chairSrc(id: CharacterCustomization["chair"])       { return `${BASE}/chair/${id}.png`; }
function clothingSrc(id: CharacterCustomization["clothing"]) { return `${BASE}/clothing/${id}.png`; }
function hairSrc(id: CharacterCustomization["hair"])         { return `${BASE}/hair/${id}.png`; }
function headSrc(tone: SkinTone)                             { return `${BASE}/skin/head_${tone}.png`; }
function handGrabSrc(tone: SkinTone)                         { return `${BASE}/hands/hand_grab_${tone}.png`; }
function handFistSrc(tone: SkinTone)                         { return `${BASE}/hands/hand_fist_${tone}.png`; }

// ── Layer validation ─────────────────────────────────────────────────────────

const REQUIRED_FRAME = { width: 512, height: 512 };

type LayerStatus = { name: string; src: string; valid: boolean; reason?: string };

function probeImage(src: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = () => reject(new Error(`Failed to load ${src}`));
    img.src = src;
  });
}

async function validateLayer(name: string, src: string): Promise<LayerStatus> {
  try {
    const { width, height } = await probeImage(src);
    if (width !== REQUIRED_FRAME.width || height !== REQUIRED_FRAME.height) {
      return { name, src, valid: false, reason: `Wrong size ${width}x${height}, need ${REQUIRED_FRAME.width}x${REQUIRED_FRAME.height}` };
    }
    return { name, src, valid: true };
  } catch {
    return { name, src, valid: false, reason: "Failed to load" };
  }
}

// ── Dev-only window helper ────────────────────────────────────────────────────

declare global {
  interface Window {
    validateCharacterAssets: () => Promise<void>;
  }
}

if (typeof window !== "undefined") {
  window.validateCharacterAssets = async () => {
    const allAssets: Array<{ name: string; src: string }> = [
      { name: "chair/chair_black",       src: `${BASE}/chair/chair_black.png` },
      { name: "chair/chair_gray",        src: `${BASE}/chair/chair_gray.png` },
      { name: "chair/chair_blue",        src: `${BASE}/chair/chair_blue.png` },
      { name: "chair/chair_beige",       src: `${BASE}/chair/chair_beige.png` },
      { name: "chair/chair_red",         src: `${BASE}/chair/chair_red.png` },
      { name: "chair/chair_green",       src: `${BASE}/chair/chair_green.png` },
      { name: "clothing/hoodie_teal",    src: `${BASE}/clothing/hoodie_teal.png` },
      { name: "clothing/jacket_dark",    src: `${BASE}/clothing/jacket_dark.png` },
      { name: "clothing/vest_stripe",    src: `${BASE}/clothing/vest_stripe.png` },
      { name: "clothing/sweater_red",    src: `${BASE}/clothing/sweater_red.png` },
      { name: "clothing/shirt_beige",    src: `${BASE}/clothing/shirt_beige.png` },
      { name: "clothing/cardigan_green", src: `${BASE}/clothing/cardigan_green.png` },
      { name: "clothing/hoodie_black",   src: `${BASE}/clothing/hoodie_black.png` },
      { name: "clothing/tshirt_beige",   src: `${BASE}/clothing/tshirt_beige.png` },
      { name: "hair/hair_brown_01",      src: `${BASE}/hair/hair_brown_01.png` },
      { name: "hair/hair_black_01",      src: `${BASE}/hair/hair_black_01.png` },
      { name: "hair/hair_blond_01",      src: `${BASE}/hair/hair_blond_01.png` },
      { name: "hair/hair_red_01",        src: `${BASE}/hair/hair_red_01.png` },
      { name: "hair/hair_green_01",      src: `${BASE}/hair/hair_green_01.png` },
      { name: "hair/hair_green_02",      src: `${BASE}/hair/hair_green_02.png` },
      { name: "hair/hair_brown_02",      src: `${BASE}/hair/hair_brown_02.png` },
      { name: "hair/hair_brown_03",      src: `${BASE}/hair/hair_brown_03.png` },
      { name: "skin/head_tone1",         src: `${BASE}/skin/head_tone1.png` },
      { name: "skin/head_tone2",         src: `${BASE}/skin/head_tone2.png` },
      { name: "skin/head_tone3",         src: `${BASE}/skin/head_tone3.png` },
      { name: "skin/head_tone4",         src: `${BASE}/skin/head_tone4.png` },
      { name: "skin/head_tone5",         src: `${BASE}/skin/head_tone5.png` },
      { name: "skin/head_tone6",         src: `${BASE}/skin/head_tone6.png` },
      { name: "hands/hand_grab_tone1",   src: `${BASE}/hands/hand_grab_tone1.png` },
      { name: "hands/hand_fist_tone1",   src: `${BASE}/hands/hand_fist_tone1.png` },
      { name: "hands/hand_grab_tone2",   src: `${BASE}/hands/hand_grab_tone2.png` },
      { name: "hands/hand_fist_tone2",   src: `${BASE}/hands/hand_fist_tone2.png` },
      { name: "hands/hand_grab_tone3",   src: `${BASE}/hands/hand_grab_tone3.png` },
      { name: "hands/hand_fist_tone3",   src: `${BASE}/hands/hand_fist_tone3.png` },
      { name: "hands/hand_grab_tone4",   src: `${BASE}/hands/hand_grab_tone4.png` },
      { name: "hands/hand_fist_tone4",   src: `${BASE}/hands/hand_fist_tone4.png` },
      { name: "hands/hand_grab_tone5",   src: `${BASE}/hands/hand_grab_tone5.png` },
      { name: "hands/hand_fist_tone5",   src: `${BASE}/hands/hand_fist_tone5.png` },
      { name: "hands/hand_grab_tone6",   src: `${BASE}/hands/hand_grab_tone6.png` },
      { name: "hands/hand_fist_tone6",   src: `${BASE}/hands/hand_fist_tone6.png` },
    ];

    console.group("[validateCharacterAssets] Checking all character assets...");
    const results = await Promise.all(allAssets.map(a => validateLayer(a.name, a.src)));
    const ok      = results.filter(r => r.valid);
    const fail    = results.filter(r => !r.valid);

    ok.forEach(r => console.log(`  ✓ ${r.name} — ${REQUIRED_FRAME.width}x${REQUIRED_FRAME.height} OK`));
    fail.forEach(r => console.warn(`  ✗ ${r.name} — ${r.reason}`));

    const defaultLayers: Array<{ name: string; src: string }> = [
      { name: "chair",    src: chairSrc("chair_black") },
      { name: "clothing", src: clothingSrc("hoodie_teal") },
      { name: "skin",     src: headSrc("tone1") },
      { name: "hands",    src: handGrabSrc("tone1") },
      { name: "hair",     src: hairSrc("hair_brown_01") },
    ];
    const defaultResults = await Promise.all(defaultLayers.map(l => validateLayer(l.name, l.src)));
    const allDefaultsValid = defaultResults.every(r => r.valid);

    console.log(`\n  Total: ${results.length} assets — ${ok.length} OK, ${fail.length} FAILED`);
    console.log(`  Required ${REQUIRED_FRAME.width}x${REQUIRED_FRAME.height} frame: all OK = ${results.every(r => r.valid)}`);
    console.log(`  Default layers all valid: ${allDefaultsValid}`);
    console.log(`  Composite can safely render: ${allDefaultsValid}`);
    console.groupEnd();
  };
}

// ── Component ────────────────────────────────────────────────────────────────

interface Props {
  customization: CharacterCustomization;
  workState:     CharWorkState;
  typingFrame?:  0 | 1;
  style?:        CSSProperties;
  className?:    string;
}

const layerStyle: CSSProperties = {
  position:      "absolute",
  inset:         0,
  width:         "100%",
  height:        "100%",
  objectFit:     "contain",
  pointerEvents: "none",
  userSelect:    "none",
};

export function CharacterComposite({ customization, workState, typingFrame = 0, style, className }: Props) {
  const { chair, clothing, skin, hair } = customization;

  const [layersValid, setLayersValid] = useState<boolean | null>(null);
  const validationDone = useRef(false);

  const handSrc = workState === "working"
    ? (typingFrame === 0 ? handGrabSrc(skin) : handFistSrc(skin))
    : workState === "celebrating"
      ? handGrabSrc(skin)
      : handFistSrc(skin);

  useEffect(() => {
    if (validationDone.current) return;
    validationDone.current = true;

    const requiredLayers: Array<{ name: string; src: string }> = [
      { name: "chair",    src: chairSrc(chair) },
      { name: "clothing", src: clothingSrc(clothing) },
      { name: "skin",     src: headSrc(skin) },
      { name: "hands",    src: handGrabSrc(skin) },
      { name: "hair",     src: hairSrc(hair) },
    ];

    Promise.all(requiredLayers.map(l => validateLayer(l.name, l.src))).then(results => {
      const invalid = results.filter(r => !r.valid);
      if (invalid.length > 0) {
        invalid.forEach(r =>
          console.warn(`[CharacterComposite] Character customization disabled: missing/invalid layer "${r.name}" — ${r.reason}`)
        );
        setLayersValid(false);
      } else {
        setLayersValid(true);
      }
    });
  }, [chair, clothing, skin, hair]);

  if (layersValid === null || layersValid === false) {
    return null;
  }

  const bobY = workState === "celebrating"
    ? [0, -10, 0, -6, 0]
    : workState === "working"
      ? [0, -2, 0]
      : [0, -1.5, 0];
  const bobDur = workState === "celebrating" ? 0.55 : workState === "working" ? 0.42 : 3.2;

  return (
    <motion.div
      className={className}
      style={{ position: "relative", width: "100%", paddingBottom: "100%", ...style }}
      animate={{ y: bobY }}
      transition={{ duration: bobDur, repeat: Infinity, ease: "easeInOut", repeatType: "mirror" }}
    >
      {/* Layer 1 — Chair (back) */}
      <img src={chairSrc(chair)}       alt="" draggable={false} style={{ ...layerStyle, zIndex: 1 }} />
      {/* Layer 2 — Clothing/body */}
      <img src={clothingSrc(clothing)} alt="" draggable={false} style={{ ...layerStyle, zIndex: 2 }} />
      {/* Layer 3 — Skin head/neck */}
      <img src={headSrc(skin)}         alt="" draggable={false} style={{ ...layerStyle, zIndex: 3 }} />
      {/* Layer 4 — Hands (state-driven) */}
      <img src={handSrc}               alt="" draggable={false} style={{ ...layerStyle, zIndex: 4 }} />
      {/* Layer 5 — Hair (topmost) */}
      <img src={hairSrc(hair)}         alt="" draggable={false} style={{ ...layerStyle, zIndex: 5 }} />
    </motion.div>
  );
}
