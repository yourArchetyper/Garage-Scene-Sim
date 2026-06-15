import { useState, useCallback } from "react";
import {
  CharacterComposite,
  DEFAULT_CUSTOMIZATION,
  DEFAULT_LAYER_TRANSFORM,
  DEFAULT_LAYER_TRANSFORMS,
  LAYER_COLORS,
  type CharacterCustomization,
  type LayerKey,
  type LayerStatus,
  type LayerTransform,
  type LayerTransforms,
  type SkinTone,
} from "./CharacterComposite";

// ── Manifest data ─────────────────────────────────────────────────────────────

const CHAIR_IDS    = ["chair_black","chair_gray","chair_blue","chair_beige","chair_red","chair_green"] as const;
const CLOTHING_IDS = ["hoodie_teal","jacket_dark","vest_stripe","sweater_red","shirt_beige","cardigan_green","hoodie_black","tshirt_beige"] as const;
const SKIN_IDS     = ["tone1","tone2","tone3","tone4","tone5","tone6"] as const;
const HAIR_IDS     = ["hair_brown_01","hair_black_01","hair_blond_01","hair_red_01","hair_green_01","hair_green_02","hair_brown_02","hair_brown_03"] as const;

const ALL_LAYER_KEYS: LayerKey[] = ["chair", "body", "clothing", "skin", "hands", "hair"];

const SKIN_SWATCH: Record<SkinTone, string> = {
  tone1: "#f5cba7", tone2: "#e8a87c", tone3: "#c68642",
  tone4: "#8d5524", tone5: "#5c3317", tone6: "#3b1f0e",
};

// ── Alignment checklist ───────────────────────────────────────────────────────

const CHECKLIST_ITEMS: string[] = [
  "Chair sits behind body",
  "Clothing/body aligns with chair",
  "Skin/head/neck connects to clothing",
  "Hands align with sleeves/keyboard pose",
  "Hair sits on head",
  "No floating pieces",
  "No white boxes",
  "Composite reads as one seated character",
];

// ── Shared micro-styles ───────────────────────────────────────────────────────

const CHECKER_BG = "repeating-conic-gradient(#3a3a3a 0% 25%, #2a2a2a 0% 50%) 0 0 / 16px 16px";

const S = {
  panel: {
    position: "absolute", bottom: "0.75rem", right: "0.75rem",
    zIndex: 60, display: "flex", flexDirection: "column" as const,
    alignItems: "flex-end", gap: "0.5rem", pointerEvents: "auto",
  } as React.CSSProperties,
  card: {
    background: "rgba(15,18,28,0.97)", backdropFilter: "blur(8px)",
    border: "1px solid rgba(251,146,60,0.3)", borderRadius: "0.75rem",
    padding: "0.65rem", width: "270px", display: "flex",
    flexDirection: "column" as const, gap: "0.55rem",
    maxHeight: "85vh", overflowY: "auto" as const,
  } as React.CSSProperties,
  label: {
    color: "#6b7280", fontSize: "8px", fontWeight: 700,
    letterSpacing: "0.06em", marginBottom: "0.2rem",
  },
  chip: (active: boolean): React.CSSProperties => ({
    fontSize: "7px", fontWeight: 600, borderRadius: "0.3rem",
    padding: "0.15rem 0.3rem", cursor: "pointer", userSelect: "none",
    border: `1px solid ${active ? "#92400e" : "rgba(55,65,81,0.4)"}`,
    color: active ? "#fbbf24" : "#9ca3af",
    background: active ? "rgba(146,64,14,0.55)" : "rgba(31,41,55,0.55)",
    transition: "all 0.1s",
  }),
  miniBtn: (color = "#6b7280"): React.CSSProperties => ({
    fontSize: "7px", fontWeight: 700, color, background: "rgba(31,41,55,0.7)",
    border: `1px solid ${color}44`, borderRadius: "0.3rem",
    padding: "0.2rem 0.45rem", cursor: "pointer", userSelect: "none",
  }),
  toggleBtn: (open: boolean): React.CSSProperties => ({
    fontSize: "9px", fontWeight: 700, letterSpacing: "0.04em",
    color: open ? "#fb923c" : "#6b7280",
    background: "rgba(17,24,39,0.88)", backdropFilter: "blur(4px)",
    border: `1px solid ${open ? "#92400e" : "rgba(55,65,81,0.5)"}`,
    borderRadius: "0.5rem", padding: "0.35rem 0.6rem",
    cursor: "pointer", userSelect: "none",
  }),
};

// ── Transform slider row ──────────────────────────────────────────────────────

interface SliderRowProps {
  label: string;
  value: number;
  min: number; max: number; step: number;
  onChange: (v: number) => void;
  display?: (v: number) => string;
}
function SliderRow({ label, value, min, max, step, onChange, display }: SliderRowProps) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
      <span style={{ fontSize: "7px", color: "#6b7280", width: "44px", flexShrink: 0 }}>{label}</span>
      <input
        data-interactive="true"
        type="range"
        min={min} max={max} step={step} value={value}
        onChange={e => onChange(Number(e.target.value))}
        style={{ flex: 1, accentColor: "#fb923c", height: "3px" }}
      />
      <span style={{ fontSize: "7px", color: "#d1d5db", width: "32px", textAlign: "right", flexShrink: 0 }}>
        {display ? display(value) : value}
      </span>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function CharacterPreviewDev() {
  const [open, setOpen]           = useState(false);
  const [customization, setCustomization] = useState<CharacterCustomization>(DEFAULT_CUSTOMIZATION);
  const [layerVis, setLayerVis]   = useState<Record<LayerKey, boolean>>({
    chair: true, body: true, clothing: true, skin: true, hands: true, hair: true,
  });
  const [showBounds, setShowBounds]               = useState(false);
  const [transforms, setTransforms]               = useState<LayerTransforms>({ ...DEFAULT_LAYER_TRANSFORMS });
  const [activeLayer, setActiveLayer]             = useState<LayerKey>("skin");
  const [validationStatuses, setValidationStatuses] = useState<LayerStatus[]>([]);
  const [checklist, setChecklist]                 = useState<Record<string, boolean>>({});
  const [copyFeedback, setCopyFeedback]           = useState(false);

  const handleValidation = useCallback((statuses: LayerStatus[]) => {
    setValidationStatuses(statuses);
  }, []);

  const setCustom = <K extends keyof CharacterCustomization>(key: K, val: CharacterCustomization[K]) =>
    setCustomization(c => ({ ...c, [key]: val }));

  const setTransform = (key: LayerKey, field: keyof LayerTransform, val: number) =>
    setTransforms(t => ({ ...t, [key]: { ...t[key], [field]: val } }));

  const resetLayer = (key: LayerKey) =>
    setTransforms(t => ({ ...t, [key]: { ...DEFAULT_LAYER_TRANSFORM } }));

  const resetAll = () => setTransforms({ ...DEFAULT_LAYER_TRANSFORMS });

  const copyCalibrationJSON = () => {
    const payload = {
      frame:         { width: 512, height: 512 },
      layerOrder:    ["chair", "body", "clothing", "skin", "hands", "hair"],
      transforms,
      selectedItems: {
        chair:    customization.chair,
        body:     `body_base_${customization.skin}`,
        clothing: customization.clothing,
        skin:     customization.skin,
        hands:    customization.skin,
        hair:     customization.hair,
      },
    };
    const json = JSON.stringify(payload, null, 2);
    console.log("[CharacterPreviewDev] Calibration JSON:", payload);
    navigator.clipboard.writeText(json).then(() => {
      setCopyFeedback(true);
      setTimeout(() => setCopyFeedback(false), 2000);
    });
  };

  const invalidLayers   = validationStatuses.filter(s => !s.valid);
  const compositeReady  = validationStatuses.length > 0 && invalidLayers.length === 0;
  const missingEnabled  = ALL_LAYER_KEYS.filter(k => !layerVis[k]);
  const t               = transforms[activeLayer];

  return (
    <div style={S.panel}>
      <button data-interactive="true" onClick={() => setOpen(v => !v)} style={S.toggleBtn(open)}>
        🔧 CHR DEV
      </button>

      {open && (
        <div style={S.card}>

          {/* ── Header ── */}
          <div style={{ color: "#fb923c", fontSize: "10px", fontWeight: 800, letterSpacing: "0.05em" }}>
            CHARACTER LAYER CALIBRATION
          </div>

          {/* ── Base body layer status ── */}
          <div style={{
            background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.3)",
            borderRadius: "0.4rem", padding: "0.4rem 0.5rem",
          }}>
            <div style={{ fontSize: "7px", color: "#86efac", fontWeight: 700, marginBottom: "0.2rem" }}>
              ✓ BASE BODY LAYER PRESENT
            </div>
            <div style={{ fontSize: "6.5px", color: "#9ca3af", lineHeight: 1.5 }}>
              body_base_tone*.png (6 tones) — layer 2, auto-matches skin tone.
              Calibrate using the BODY tab. Toggle visibility to check layering.
            </div>
          </div>

          {/* ── Preview viewport ── */}
          <div style={{
            width: "100%", aspectRatio: "1/1", background: CHECKER_BG,
            borderRadius: "0.5rem", overflow: "hidden", position: "relative",
            border: "1px solid rgba(55,65,81,0.6)",
          }}>
            <CharacterComposite
              customization={customization}
              workState="idle"
              typingFrame={0}
              devMode={true}
              devLayerVis={layerVis}
              devShowBounds={showBounds}
              devLayerTransforms={transforms}
              onValidationChange={handleValidation}
              style={{ width: "100%", paddingBottom: "100%" }}
            />
          </div>

          {/* ── Composite status ── */}
          {validationStatuses.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.15rem" }}>
              {compositeReady ? (
                <div style={{ fontSize: "7.5px", color: "#34d399", fontWeight: 700 }}>
                  ✓ All layers load — composite ready
                  {missingEnabled.length > 0 && ` (partial view: ${missingEnabled.join(", ")} hidden)`}
                </div>
              ) : (
                invalidLayers.map(s => (
                  <div key={s.name} style={{ fontSize: "7.5px", color: "#f87171", fontWeight: 700 }}>
                    ✗ Invalid: layer "{s.name}" — {s.reason}
                  </div>
                ))
              )}
            </div>
          )}

          {/* ── Screenshot note ── */}
          <div style={{ fontSize: "6.5px", color: "#4b5563", lineHeight: 1.5, fontStyle: "italic" }}>
            📸 After tuning, take a screenshot of this preview before enabling
            main-scene customization.
          </div>

          {/* ── Action buttons ── */}
          <div style={{ display: "flex", gap: "0.35rem", flexWrap: "wrap" }}>
            <button data-interactive="true" onClick={resetAll} style={S.miniBtn("#f87171")}>
              Reset All
            </button>
            <button data-interactive="true" onClick={copyCalibrationJSON} style={S.miniBtn(copyFeedback ? "#34d399" : "#fb923c")}>
              {copyFeedback ? "✓ Copied!" : "Copy Calibration JSON"}
            </button>
          </div>

          {/* ── Layer transform controls ── */}
          <div>
            <div style={S.label}>LAYER TRANSFORMS</div>
            {/* Layer tab picker */}
            <div style={{ display: "flex", gap: "0.2rem", marginBottom: "0.4rem", flexWrap: "wrap" }}>
              {ALL_LAYER_KEYS.map(key => (
                <button
                  key={key}
                  data-interactive="true"
                  onClick={() => setActiveLayer(key)}
                  style={{
                    ...S.chip(activeLayer === key),
                    borderColor: activeLayer === key ? LAYER_COLORS[key] : "rgba(55,65,81,0.4)",
                    color: activeLayer === key ? LAYER_COLORS[key] : "#6b7280",
                    background: activeLayer === key ? `${LAYER_COLORS[key]}22` : "rgba(31,41,55,0.55)",
                  }}
                >
                  {key.toUpperCase()}
                </button>
              ))}
            </div>

            {/* Active layer sliders */}
            <div style={{
              background: "rgba(31,41,55,0.4)", borderRadius: "0.4rem",
              padding: "0.45rem 0.5rem", display: "flex", flexDirection: "column", gap: "0.35rem",
              border: `1px solid ${LAYER_COLORS[activeLayer]}44`,
            }}>
              <div style={{ fontSize: "7px", fontWeight: 700, color: LAYER_COLORS[activeLayer], marginBottom: "0.1rem" }}>
                {activeLayer.toUpperCase()}
              </div>
              <SliderRow label="X offset" value={t.x}        min={-150} max={150} step={1}    onChange={v => setTransform(activeLayer, "x", v)}        display={v => `${v}px`} />
              <SliderRow label="Y offset" value={t.y}        min={-150} max={150} step={1}    onChange={v => setTransform(activeLayer, "y", v)}        display={v => `${v}px`} />
              <SliderRow label="Scale"    value={t.scale}    min={0.5}  max={2.0} step={0.01} onChange={v => setTransform(activeLayer, "scale", v)}    display={v => v.toFixed(2)} />
              <SliderRow label="Rotation" value={t.rotation} min={-45}  max={45}  step={1}    onChange={v => setTransform(activeLayer, "rotation", v)} display={v => `${v}°`} />
              <SliderRow label="Opacity"  value={t.opacity}  min={0}    max={1}   step={0.01} onChange={v => setTransform(activeLayer, "opacity", v)}  display={v => v.toFixed(2)} />
              <button
                data-interactive="true"
                onClick={() => resetLayer(activeLayer)}
                style={{ ...S.miniBtn("#6b7280"), alignSelf: "flex-start", marginTop: "0.1rem" }}
              >
                Reset {activeLayer}
              </button>
            </div>
          </div>

          {/* ── Frame outlines ── */}
          <div>
            <div style={S.label}>FRAME OUTLINES (512×512)</div>
            <label data-interactive="true" style={{ display: "flex", alignItems: "center", gap: "0.35rem", cursor: "pointer", userSelect: "none" }}>
              <input
                type="checkbox" checked={showBounds}
                onChange={e => setShowBounds(e.target.checked)}
                style={{ accentColor: "#fb923c", width: "11px", height: "11px" }}
              />
              <span style={{ fontSize: "8px", color: "#9ca3af" }}>Show layer bounds</span>
            </label>
          </div>

          {/* ── Layer visibility ── */}
          <div>
            <div style={S.label}>LAYER VISIBILITY</div>
            <div style={{ display: "flex", gap: "0.25rem", flexWrap: "wrap" }}>
              {ALL_LAYER_KEYS.map(key => {
                const on = layerVis[key];
                return (
                  <label
                    key={key}
                    data-interactive="true"
                    style={{ display: "flex", alignItems: "center", gap: "0.25rem", cursor: "pointer", userSelect: "none" }}
                  >
                    <input
                      type="checkbox" checked={on}
                      onChange={e => setLayerVis(v => ({ ...v, [key]: e.target.checked }))}
                      style={{ accentColor: LAYER_COLORS[key], width: "10px", height: "10px" }}
                    />
                    <span style={{ fontSize: "7px", fontWeight: 700, color: on ? LAYER_COLORS[key] : "#374151" }}>
                      {key.toUpperCase()}
                    </span>
                  </label>
                );
              })}
            </div>
            {missingEnabled.length > 0 && (
              <div style={{ fontSize: "7px", color: "#fbbf24", marginTop: "0.2rem" }}>
                ⚠ Partial view — {missingEnabled.join(", ")} hidden
              </div>
            )}
          </div>

          {/* ── Chair ── */}
          <div>
            <div style={S.label}>CHAIR</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.2rem" }}>
              {CHAIR_IDS.map(id => (
                <button key={id} data-interactive="true" onClick={() => setCustom("chair", id)} style={S.chip(customization.chair === id)}>
                  {id.replace("chair_", "")}
                </button>
              ))}
            </div>
          </div>

          {/* ── Clothing ── */}
          <div>
            <div style={S.label}>CLOTHING</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.2rem" }}>
              {CLOTHING_IDS.map(id => (
                <button key={id} data-interactive="true" onClick={() => setCustom("clothing", id)} style={S.chip(customization.clothing === id)}>
                  {id.replace(/_/g, " ")}
                </button>
              ))}
            </div>
          </div>

          {/* ── Skin tone ── */}
          <div>
            <div style={S.label}>SKIN TONE</div>
            <div style={{ display: "flex", gap: "0.3rem", flexWrap: "wrap" }}>
              {SKIN_IDS.map(id => (
                <button
                  key={id} data-interactive="true" title={id}
                  onClick={() => setCustom("skin", id)}
                  style={{
                    width: "18px", height: "18px", borderRadius: "50%",
                    background: SKIN_SWATCH[id], cursor: "pointer", outline: "none",
                    border: `2px solid ${customization.skin === id ? "#fbbf24" : "transparent"}`,
                  }}
                />
              ))}
            </div>
          </div>

          {/* ── Hair ── */}
          <div>
            <div style={S.label}>HAIR</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.2rem" }}>
              {HAIR_IDS.map(id => (
                <button key={id} data-interactive="true" onClick={() => setCustom("hair", id)} style={S.chip(customization.hair === id)}>
                  {id.replace("hair_", "").replace(/_/g, " ")}
                </button>
              ))}
            </div>
          </div>

          {/* ── Hands note ── */}
          <div>
            <div style={S.label}>HANDS</div>
            <div style={{ fontSize: "7px", color: "#6b7280", lineHeight: 1.4 }}>
              Follow skin tone. Grab pose shown in preview.
              Use the Hands transform tab to offset if misaligned.
            </div>
          </div>

          {/* ── Alignment checklist ── */}
          <div>
            <div style={S.label}>ALIGNMENT CHECKLIST</div>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.2rem" }}>
              {CHECKLIST_ITEMS.map(item => (
                <label
                  key={item}
                  data-interactive="true"
                  style={{ display: "flex", alignItems: "flex-start", gap: "0.3rem", cursor: "pointer", userSelect: "none" }}
                >
                  <input
                    type="checkbox"
                    checked={!!checklist[item]}
                    onChange={e => setChecklist(c => ({ ...c, [item]: e.target.checked }))}
                    style={{ accentColor: "#34d399", width: "10px", height: "10px", marginTop: "1px", flexShrink: 0 }}
                  />
                  <span style={{
                    fontSize: "7px", lineHeight: 1.4,
                    color: checklist[item] ? "#34d399" : "#9ca3af",
                    textDecoration: checklist[item] ? "line-through" : "none",
                  }}>
                    {item}
                  </span>
                </label>
              ))}
            </div>
            {Object.values(checklist).every(Boolean) && Object.values(checklist).length === CHECKLIST_ITEMS.length && (
              <div style={{ fontSize: "7px", color: "#34d399", fontWeight: 700, marginTop: "0.25rem" }}>
                ✓ All checks passed
              </div>
            )}
          </div>

        </div>
      )}
    </div>
  );
}
