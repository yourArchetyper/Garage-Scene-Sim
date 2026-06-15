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

export type LayerKey = "chair" | "clothing" | "skin" | "hands" | "hair";

export type LayerStatus = { name: LayerKey; src: string; valid: boolean; reason?: string };

// ── Asset URL helpers ────────────────────────────────────────────────────────

export const CHARACTER_BASE = "/character";

export function chairSrc(id: CharacterCustomization["chair"])       { return `${CHARACTER_BASE}/chair/${id}.png`; }
export function clothingSrc(id: CharacterCustomization["clothing"]) { return `${CHARACTER_BASE}/clothing/${id}.png`; }
export function hairSrc(id: CharacterCustomization["hair"])         { return `${CHARACTER_BASE}/hair/${id}.png`; }
export function headSrc(tone: SkinTone)                             { return `${CHARACTER_BASE}/skin/head_${tone}.png`; }
export function handGrabSrc(tone: SkinTone)                         { return `${CHARACTER_BASE}/hands/hand_grab_${tone}.png`; }
export function handFistSrc(tone: SkinTone)                         { return `${CHARACTER_BASE}/hands/hand_fist_${tone}.png`; }

// ── Layer validation ─────────────────────────────────────────────────────────

export const REQUIRED_FRAME = { width: 512, height: 512 };

function probeImage(src: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload  = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = () => reject(new Error(`Failed to load ${src}`));
    img.src = src;
  });
}

export async function validateLayerSrc(name: LayerKey, src: string): Promise<LayerStatus> {
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
    const allAssets: Array<{ name: LayerKey; src: string }> = [
      { name: "chair",    src: `${CHARACTER_BASE}/chair/chair_black.png` },
      { name: "chair",    src: `${CHARACTER_BASE}/chair/chair_gray.png` },
      { name: "chair",    src: `${CHARACTER_BASE}/chair/chair_blue.png` },
      { name: "chair",    src: `${CHARACTER_BASE}/chair/chair_beige.png` },
      { name: "chair",    src: `${CHARACTER_BASE}/chair/chair_red.png` },
      { name: "chair",    src: `${CHARACTER_BASE}/chair/chair_green.png` },
      { name: "clothing", src: `${CHARACTER_BASE}/clothing/hoodie_teal.png` },
      { name: "clothing", src: `${CHARACTER_BASE}/clothing/jacket_dark.png` },
      { name: "clothing", src: `${CHARACTER_BASE}/clothing/vest_stripe.png` },
      { name: "clothing", src: `${CHARACTER_BASE}/clothing/sweater_red.png` },
      { name: "clothing", src: `${CHARACTER_BASE}/clothing/shirt_beige.png` },
      { name: "clothing", src: `${CHARACTER_BASE}/clothing/cardigan_green.png` },
      { name: "clothing", src: `${CHARACTER_BASE}/clothing/hoodie_black.png` },
      { name: "clothing", src: `${CHARACTER_BASE}/clothing/tshirt_beige.png` },
      { name: "hair",     src: `${CHARACTER_BASE}/hair/hair_brown_01.png` },
      { name: "hair",     src: `${CHARACTER_BASE}/hair/hair_black_01.png` },
      { name: "hair",     src: `${CHARACTER_BASE}/hair/hair_blond_01.png` },
      { name: "hair",     src: `${CHARACTER_BASE}/hair/hair_red_01.png` },
      { name: "hair",     src: `${CHARACTER_BASE}/hair/hair_green_01.png` },
      { name: "hair",     src: `${CHARACTER_BASE}/hair/hair_green_02.png` },
      { name: "hair",     src: `${CHARACTER_BASE}/hair/hair_brown_02.png` },
      { name: "hair",     src: `${CHARACTER_BASE}/hair/hair_brown_03.png` },
      { name: "skin",     src: `${CHARACTER_BASE}/skin/head_tone1.png` },
      { name: "skin",     src: `${CHARACTER_BASE}/skin/head_tone2.png` },
      { name: "skin",     src: `${CHARACTER_BASE}/skin/head_tone3.png` },
      { name: "skin",     src: `${CHARACTER_BASE}/skin/head_tone4.png` },
      { name: "skin",     src: `${CHARACTER_BASE}/skin/head_tone5.png` },
      { name: "skin",     src: `${CHARACTER_BASE}/skin/head_tone6.png` },
      { name: "hands",    src: `${CHARACTER_BASE}/hands/hand_grab_tone1.png` },
      { name: "hands",    src: `${CHARACTER_BASE}/hands/hand_fist_tone1.png` },
      { name: "hands",    src: `${CHARACTER_BASE}/hands/hand_grab_tone2.png` },
      { name: "hands",    src: `${CHARACTER_BASE}/hands/hand_fist_tone2.png` },
      { name: "hands",    src: `${CHARACTER_BASE}/hands/hand_grab_tone3.png` },
      { name: "hands",    src: `${CHARACTER_BASE}/hands/hand_fist_tone3.png` },
      { name: "hands",    src: `${CHARACTER_BASE}/hands/hand_grab_tone4.png` },
      { name: "hands",    src: `${CHARACTER_BASE}/hands/hand_fist_tone4.png` },
      { name: "hands",    src: `${CHARACTER_BASE}/hands/hand_grab_tone5.png` },
      { name: "hands",    src: `${CHARACTER_BASE}/hands/hand_fist_tone5.png` },
      { name: "hands",    src: `${CHARACTER_BASE}/hands/hand_grab_tone6.png` },
      { name: "hands",    src: `${CHARACTER_BASE}/hands/hand_fist_tone6.png` },
    ];

    console.group("[validateCharacterAssets] Checking all character assets...");
    const results = await Promise.all(allAssets.map(a => validateLayerSrc(a.name, a.src)));
    const ok   = results.filter(r => r.valid);
    const fail = results.filter(r => !r.valid);

    ok.forEach(r   => console.log(`  ✓ ${r.src.split("/").slice(-2).join("/")} — ${REQUIRED_FRAME.width}x${REQUIRED_FRAME.height} OK`));
    fail.forEach(r => console.warn(`  ✗ ${r.src.split("/").slice(-2).join("/")} — ${r.reason}`));

    const defaultLayers: Array<{ name: LayerKey; src: string }> = [
      { name: "chair",    src: chairSrc("chair_black") },
      { name: "clothing", src: clothingSrc("hoodie_teal") },
      { name: "skin",     src: headSrc("tone1") },
      { name: "hands",    src: handGrabSrc("tone1") },
      { name: "hair",     src: hairSrc("hair_brown_01") },
    ];
    const defaultResults   = await Promise.all(defaultLayers.map(l => validateLayerSrc(l.name, l.src)));
    const allDefaultsValid = defaultResults.every(r => r.valid);

    console.log(`\n  Total: ${results.length} assets — ${ok.length} OK, ${fail.length} FAILED`);
    console.log(`  Required ${REQUIRED_FRAME.width}x${REQUIRED_FRAME.height} frame: all OK = ${results.every(r => r.valid)}`);
    console.log(`  Default layers all valid: ${allDefaultsValid}`);
    console.log(`  Composite can safely render: ${allDefaultsValid}`);
    console.groupEnd();
  };
}

// ── Layer debug outline colors ────────────────────────────────────────────────

export const LAYER_COLORS: Record<LayerKey, string> = {
  chair:    "#3b82f6",
  clothing: "#f59e0b",
  skin:     "#f97316",
  hands:    "#8b5cf6",
  hair:     "#10b981",
};

// ── Component ────────────────────────────────────────────────────────────────

interface Props {
  customization: CharacterCustomization;
  workState:     CharWorkState;
  typingFrame?:  0 | 1;
  style?:        CSSProperties;
  className?:    string;
  /** Dev only: bypass null-guard so all layers render regardless of validation state */
  devMode?:          boolean;
  /** Dev only: per-layer visibility overrides */
  devLayerVis?:      Partial<Record<LayerKey, boolean>>;
  /** Dev only: draw 512×512 frame outline on each layer */
  devShowBounds?:    boolean;
  /** Dev only: called whenever validation results change */
  onValidationChange?: (statuses: LayerStatus[]) => void;
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

function LayerImg({
  src, alt, zIndex, visible, showBounds, layerKey,
}: {
  src: string; alt: string; zIndex: number;
  visible: boolean; showBounds: boolean; layerKey: LayerKey;
}) {
  if (!visible) return null;
  return (
    <div style={{ position: "absolute", inset: 0, zIndex }}>
      <img src={src} alt={alt} draggable={false} style={layerStyle} />
      {showBounds && (
        <>
          <div style={{
            position: "absolute", inset: 0,
            border: `2px solid ${LAYER_COLORS[layerKey]}`,
            pointerEvents: "none",
            boxSizing: "border-box",
          }} />
          <span style={{
            position: "absolute", top: 2, left: 4,
            fontSize: "8px", fontWeight: 700, lineHeight: 1,
            color: LAYER_COLORS[layerKey],
            textShadow: "0 0 3px #000",
            pointerEvents: "none",
            userSelect: "none",
          }}>
            {layerKey}
          </span>
        </>
      )}
    </div>
  );
}

export function CharacterComposite({
  customization, workState, typingFrame = 0, style, className,
  devMode = false, devLayerVis, devShowBounds = false, onValidationChange,
}: Props) {
  const { chair, clothing, skin, hair } = customization;

  const [layersValid, setLayersValid] = useState<boolean | null>(null);
  const onValidationChangeRef = useRef(onValidationChange);
  onValidationChangeRef.current = onValidationChange;

  const handSrc = workState === "working"
    ? (typingFrame === 0 ? handGrabSrc(skin) : handFistSrc(skin))
    : workState === "celebrating"
      ? handGrabSrc(skin)
      : handFistSrc(skin);

  useEffect(() => {
    setLayersValid(null);

    const requiredLayers: Array<{ name: LayerKey; src: string }> = [
      { name: "chair",    src: chairSrc(chair) },
      { name: "clothing", src: clothingSrc(clothing) },
      { name: "skin",     src: headSrc(skin) },
      { name: "hands",    src: handGrabSrc(skin) },
      { name: "hair",     src: hairSrc(hair) },
    ];

    Promise.all(requiredLayers.map(l => validateLayerSrc(l.name, l.src))).then(results => {
      onValidationChangeRef.current?.(results);
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

  if (!devMode && (layersValid === null || layersValid === false)) {
    return null;
  }

  const vis = (key: LayerKey) => devLayerVis ? (devLayerVis[key] ?? true) : true;

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
      <LayerImg src={chairSrc(chair)}       alt="" zIndex={1} layerKey="chair"    visible={vis("chair")}    showBounds={devShowBounds} />
      <LayerImg src={clothingSrc(clothing)} alt="" zIndex={2} layerKey="clothing" visible={vis("clothing")} showBounds={devShowBounds} />
      <LayerImg src={headSrc(skin)}         alt="" zIndex={3} layerKey="skin"     visible={vis("skin")}     showBounds={devShowBounds} />
      <LayerImg src={handSrc}               alt="" zIndex={4} layerKey="hands"    visible={vis("hands")}    showBounds={devShowBounds} />
      <LayerImg src={hairSrc(hair)}         alt="" zIndex={5} layerKey="hair"     visible={vis("hair")}     showBounds={devShowBounds} />
    </motion.div>
  );
}
