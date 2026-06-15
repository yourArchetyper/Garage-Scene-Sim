import { CSSProperties } from "react";
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

function chairSrc(id: CharacterCustomization["chair"])    { return `${BASE}/chair/${id}.png`; }
function clothingSrc(id: CharacterCustomization["clothing"]) { return `${BASE}/clothing/${id}.png`; }
function hairSrc(id: CharacterCustomization["hair"])      { return `${BASE}/hair/${id}.png`; }
function headSrc(tone: SkinTone)                          { return `${BASE}/skin/head_${tone}.png`; }
function handGrabSrc(tone: SkinTone)                      { return `${BASE}/hands/hand_grab_${tone}.png`; }
function handFistSrc(tone: SkinTone)                      { return `${BASE}/hands/hand_fist_${tone}.png`; }

// ── Component ────────────────────────────────────────────────────────────────

interface Props {
  customization: CharacterCustomization;
  workState:     CharWorkState;
  typingFrame?:  0 | 1;
  style?:        CSSProperties;
  className?:    string;
}

const layerStyle: CSSProperties = {
  position:   "absolute",
  inset:      0,
  width:      "100%",
  height:     "100%",
  objectFit:  "contain",
  pointerEvents: "none",
  userSelect: "none",
};

export function CharacterComposite({ customization, workState, typingFrame = 0, style, className }: Props) {
  const { chair, clothing, skin, hair } = customization;

  // Hands alternate between grab (typing frame 0) and fist (frame 1) while working
  const handSrc = workState === "working"
    ? (typingFrame === 0 ? handGrabSrc(skin) : handFistSrc(skin))
    : workState === "celebrating"
      ? handGrabSrc(skin)
      : handFistSrc(skin);

  // Vertical bob animation per state
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
      <img src={chairSrc(chair)}    alt="" draggable={false} style={{ ...layerStyle, zIndex: 1 }} />
      {/* Layer 2 — Clothing/body */}
      <img src={clothingSrc(clothing)} alt="" draggable={false} style={{ ...layerStyle, zIndex: 2 }} />
      {/* Layer 3 — Skin head/neck */}
      <img src={headSrc(skin)}      alt="" draggable={false} style={{ ...layerStyle, zIndex: 3 }} />
      {/* Layer 4 — Hands (state-driven) */}
      <img src={handSrc}            alt="" draggable={false} style={{ ...layerStyle, zIndex: 4 }} />
      {/* Layer 5 — Hair (topmost) */}
      <img src={hairSrc(hair)}      alt="" draggable={false} style={{ ...layerStyle, zIndex: 5 }} />
    </motion.div>
  );
}
