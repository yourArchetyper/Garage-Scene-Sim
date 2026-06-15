import { useState, useCallback } from "react";
import {
  CharacterComposite,
  DEFAULT_CUSTOMIZATION,
  LAYER_COLORS,
  type CharacterCustomization,
  type LayerKey,
  type LayerStatus,
  type SkinTone,
} from "./CharacterComposite";

// ── Manifest data (mirrors assets/character/manifest.json) ───────────────────

const CHAIR_IDS    = ["chair_black","chair_gray","chair_blue","chair_beige","chair_red","chair_green"] as const;
const CLOTHING_IDS = ["hoodie_teal","jacket_dark","vest_stripe","sweater_red","shirt_beige","cardigan_green","hoodie_black","tshirt_beige"] as const;
const SKIN_IDS     = ["tone1","tone2","tone3","tone4","tone5","tone6"] as const;
const HAIR_IDS     = ["hair_brown_01","hair_black_01","hair_blond_01","hair_red_01","hair_green_01","hair_green_02","hair_brown_02","hair_brown_03"] as const;

const ALL_LAYER_KEYS: LayerKey[] = ["chair", "clothing", "skin", "hands", "hair"];

// Skin swatches for visual tone pickers
const SKIN_SWATCH: Record<SkinTone, string> = {
  tone1: "#f5cba7", tone2: "#e8a87c", tone3: "#c68642",
  tone4: "#8d5524", tone5: "#5c3317", tone6: "#3b1f0e",
};

// ── Checker background ───────────────────────────────────────────────────────

const CHECKER_BG = "repeating-conic-gradient(#3a3a3a 0% 25%, #2a2a2a 0% 50%) 0 0 / 16px 16px";

// ── Styles ───────────────────────────────────────────────────────────────────

const panelStyle: React.CSSProperties = {
  position:      "absolute",
  bottom:        "0.75rem",
  right:         "0.75rem",
  zIndex:        60,
  display:       "flex",
  flexDirection: "column",
  alignItems:    "flex-end",
  gap:           "0.5rem",
  pointerEvents: "auto",
};

const toggleBtnStyle: React.CSSProperties = {
  fontSize:       "9px",
  fontWeight:     700,
  color:          "#fb923c",
  background:     "rgba(17,24,39,0.88)",
  backdropFilter: "blur(4px)",
  border:         "1px solid #92400e",
  borderRadius:   "0.5rem",
  padding:        "0.35rem 0.6rem",
  cursor:         "pointer",
  userSelect:     "none",
  letterSpacing:  "0.04em",
};

const cardStyle: React.CSSProperties = {
  background:     "rgba(15,18,28,0.96)",
  backdropFilter: "blur(8px)",
  border:         "1px solid rgba(251,146,60,0.35)",
  borderRadius:   "0.75rem",
  padding:        "0.75rem",
  width:          "260px",
  display:        "flex",
  flexDirection:  "column",
  gap:            "0.6rem",
  maxHeight:      "80vh",
  overflowY:      "auto",
};

const sectionLabel: React.CSSProperties = {
  color:         "#6b7280",
  fontSize:      "8px",
  fontWeight:    700,
  letterSpacing: "0.06em",
  marginBottom:  "0.25rem",
};

const chipBase: React.CSSProperties = {
  fontSize:     "7px",
  fontWeight:   600,
  borderRadius: "0.3rem",
  padding:      "0.18rem 0.32rem",
  cursor:       "pointer",
  userSelect:   "none",
  border:       "1px solid transparent",
  transition:   "all 0.1s",
};

// ── Sub-components ────────────────────────────────────────────────────────────

function Chip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      data-interactive="true"
      onClick={onClick}
      style={{
        ...chipBase,
        color:      active ? "#fbbf24" : "#9ca3af",
        background: active ? "rgba(146,64,14,0.55)" : "rgba(31,41,55,0.55)",
        borderColor: active ? "#92400e" : "rgba(55,65,81,0.4)",
      }}
    >
      {label}
    </button>
  );
}

function LayerToggle({ layerKey, enabled, onChange }: { layerKey: LayerKey; enabled: boolean; onChange: (v: boolean) => void }) {
  const color = LAYER_COLORS[layerKey];
  return (
    <label
      data-interactive="true"
      style={{ display: "flex", alignItems: "center", gap: "0.35rem", cursor: "pointer", userSelect: "none" }}
    >
      <input
        type="checkbox"
        checked={enabled}
        onChange={e => onChange(e.target.checked)}
        style={{ accentColor: color, width: "11px", height: "11px" }}
      />
      <span style={{ fontSize: "8px", fontWeight: 700, color, letterSpacing: "0.04em" }}>
        {layerKey.toUpperCase()}
      </span>
      <span style={{ fontSize: "7px", color: "#374151", marginLeft: "auto" }}>
        ━ frame outline
      </span>
    </label>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function CharacterPreviewDev() {
  const [open, setOpen] = useState(false);
  const [customization, setCustomization] = useState<CharacterCustomization>(DEFAULT_CUSTOMIZATION);
  const [layerVis, setLayerVis] = useState<Record<LayerKey, boolean>>({
    chair: true, clothing: true, skin: true, hands: true, hair: true,
  });
  const [showBounds, setShowBounds] = useState(false);
  const [validationStatuses, setValidationStatuses] = useState<LayerStatus[]>([]);

  const handleValidation = useCallback((statuses: LayerStatus[]) => {
    setValidationStatuses(statuses);
  }, []);

  const set = <K extends keyof CharacterCustomization>(key: K, val: CharacterCustomization[K]) =>
    setCustomization(c => ({ ...c, [key]: val }));

  const toggleLayer = (key: LayerKey, val: boolean) =>
    setLayerVis(v => ({ ...v, [key]: val }));

  const invalidLayers  = validationStatuses.filter(s => !s.valid);
  const enabledLayers  = ALL_LAYER_KEYS.filter(k => layerVis[k]);
  const compositeReady = validationStatuses.length > 0 && invalidLayers.length === 0;

  // A "valid composite" requires all 5 required layer types to be enabled
  const requiredEnabled = ALL_LAYER_KEYS.every(k => layerVis[k]);
  const missingEnabled  = ALL_LAYER_KEYS.filter(k => !layerVis[k]);

  return (
    <div style={panelStyle}>
      <button
        data-interactive="true"
        onClick={() => setOpen(v => !v)}
        style={{ ...toggleBtnStyle, color: open ? "#fb923c" : "#6b7280", borderColor: open ? "#92400e" : "rgba(55,65,81,0.5)" }}
      >
        🔧 CHR DEV
      </button>

      {open && (
        <div style={cardStyle}>

          {/* ── Header ── */}
          <div style={{ color: "#fb923c", fontSize: "10px", fontWeight: 800, letterSpacing: "0.05em" }}>
            CHARACTER LAYER PREVIEW
          </div>

          {/* ── Preview viewport ── */}
          <div style={{
            width: "100%", aspectRatio: "1/1",
            background: CHECKER_BG,
            borderRadius: "0.5rem",
            overflow: "hidden",
            position: "relative",
            border: "1px solid rgba(55,65,81,0.6)",
          }}>
            <CharacterComposite
              customization={customization}
              workState="idle"
              typingFrame={0}
              devMode={true}
              devLayerVis={layerVis}
              devShowBounds={showBounds}
              onValidationChange={handleValidation}
              style={{ width: "100%", paddingBottom: "100%" }}
            />
          </div>

          {/* ── Composite status ── */}
          {validationStatuses.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.2rem" }}>
              {compositeReady && requiredEnabled ? (
                <div style={{ fontSize: "8px", color: "#34d399", fontWeight: 700 }}>
                  ✓ All layers valid — composite ready
                </div>
              ) : (
                <>
                  {!compositeReady && invalidLayers.map(s => (
                    <div key={s.name} style={{ fontSize: "8px", color: "#f87171", fontWeight: 700 }}>
                      ✗ Invalid composite: layer "{s.name}" failed — {s.reason}
                    </div>
                  ))}
                  {compositeReady && !requiredEnabled && (
                    <div style={{ fontSize: "8px", color: "#fbbf24", fontWeight: 700 }}>
                      ⚠ Partial view — {missingEnabled.map(k => k).join(", ")} hidden
                    </div>
                  )}
                </>
              )}
              {/* Base body note */}
              <div style={{ fontSize: "7px", color: "#6b7280", lineHeight: "1.4", marginTop: "0.1rem" }}>
                ℹ No separate base-body layer — clothing acts as body.
                Verify head/collar and hands/sleeve alignment visually.
              </div>
            </div>
          )}

          {/* ── Layer bounds toggle ── */}
          <div>
            <div style={sectionLabel}>FRAME OUTLINES (512×512)</div>
            <label data-interactive="true" style={{ display: "flex", alignItems: "center", gap: "0.35rem", cursor: "pointer", userSelect: "none" }}>
              <input
                type="checkbox"
                checked={showBounds}
                onChange={e => setShowBounds(e.target.checked)}
                style={{ accentColor: "#fb923c", width: "11px", height: "11px" }}
              />
              <span style={{ fontSize: "8px", color: "#9ca3af" }}>Show layer bounds</span>
            </label>
          </div>

          {/* ── Layer visibility toggles ── */}
          <div>
            <div style={sectionLabel}>LAYER VISIBILITY</div>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
              {ALL_LAYER_KEYS.map(key => (
                <LayerToggle
                  key={key}
                  layerKey={key}
                  enabled={layerVis[key]}
                  onChange={v => toggleLayer(key, v)}
                />
              ))}
            </div>
            {enabledLayers.length < ALL_LAYER_KEYS.length && (
              <div style={{ fontSize: "7px", color: "#fbbf24", marginTop: "0.25rem" }}>
                ⚠ Partial view — {missingEnabled.join(", ")} off
              </div>
            )}
          </div>

          {/* ── Chair selector ── */}
          <div>
            <div style={sectionLabel}>CHAIR</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.2rem" }}>
              {CHAIR_IDS.map(id => (
                <Chip
                  key={id}
                  label={id.replace("chair_", "")}
                  active={customization.chair === id}
                  onClick={() => set("chair", id)}
                />
              ))}
            </div>
          </div>

          {/* ── Clothing selector ── */}
          <div>
            <div style={sectionLabel}>CLOTHING</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.2rem" }}>
              {CLOTHING_IDS.map(id => (
                <Chip
                  key={id}
                  label={id.replace(/_/g, " ")}
                  active={customization.clothing === id}
                  onClick={() => set("clothing", id)}
                />
              ))}
            </div>
          </div>

          {/* ── Skin selector ── */}
          <div>
            <div style={sectionLabel}>SKIN TONE</div>
            <div style={{ display: "flex", gap: "0.3rem", flexWrap: "wrap" }}>
              {SKIN_IDS.map(id => (
                <button
                  key={id}
                  data-interactive="true"
                  onClick={() => set("skin", id)}
                  title={id}
                  style={{
                    width: "18px", height: "18px", borderRadius: "50%",
                    background: SKIN_SWATCH[id],
                    border: `2px solid ${customization.skin === id ? "#fbbf24" : "transparent"}`,
                    cursor: "pointer", outline: "none",
                  }}
                />
              ))}
            </div>
          </div>

          {/* ── Hair selector ── */}
          <div>
            <div style={sectionLabel}>HAIR</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.2rem" }}>
              {HAIR_IDS.map(id => (
                <Chip
                  key={id}
                  label={id.replace("hair_", "").replace(/_/g, " ")}
                  active={customization.hair === id}
                  onClick={() => set("hair", id)}
                />
              ))}
            </div>
          </div>

          {/* ── Hands note ── */}
          <div>
            <div style={sectionLabel}>HANDS</div>
            <div style={{ fontSize: "7px", color: "#6b7280", lineHeight: 1.4 }}>
              Hands follow skin tone. Uses grab pose in idle/preview.
              Driven by workState in game.
            </div>
          </div>

        </div>
      )}
    </div>
  );
}
