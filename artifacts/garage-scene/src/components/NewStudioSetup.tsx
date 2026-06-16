import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CharacterComposite,
  DEFAULT_CUSTOMIZATION,
  type CharacterCustomization,
  type SkinTone,
} from "./CharacterComposite";

// ── Constants ────────────────────────────────────────────────────────────────

const SKIN_SWATCHES: { tone: SkinTone; hex: string }[] = [
  { tone: "tone1", hex: "#f5cba7" },
  { tone: "tone2", hex: "#e8a87c" },
  { tone: "tone3", hex: "#c68642" },
  { tone: "tone4", hex: "#8d5524" },
  { tone: "tone5", hex: "#5c3317" },
  { tone: "tone6", hex: "#3b1f0e" },
];

const CLOTHING_OPTIONS: { id: CharacterCustomization["clothing"]; label: string }[] = [
  { id: "hoodie_teal",    label: "Teal Hoodie" },
  { id: "hoodie_black",   label: "Black Hoodie" },
  { id: "jacket_dark",    label: "Dark Jacket" },
  { id: "shirt_beige",    label: "Beige Shirt" },
  { id: "sweater_red",    label: "Red Sweater" },
  { id: "cardigan_green", label: "Green Cardigan" },
  { id: "vest_stripe",    label: "Striped Vest" },
  { id: "tshirt_beige",   label: "Beige Tee" },
];

const HAIR_OPTIONS: { id: CharacterCustomization["hair"]; label: string; color: string }[] = [
  { id: "hair_brown_01", label: "Brown",  color: "#6b3f1a" },
  { id: "hair_black_01", label: "Black",  color: "#1a1a1a" },
  { id: "hair_blond_01", label: "Blond",  color: "#d4a843" },
  { id: "hair_red_01",   label: "Red",    color: "#9b2c0a" },
  { id: "hair_green_01", label: "Green",  color: "#22793c" },
  { id: "hair_green_02", label: "Lime",   color: "#5abf3a" },
  { id: "hair_brown_02", label: "Chestnut", color: "#7b3d18" },
  { id: "hair_brown_03", label: "Auburn", color: "#a04820" },
];

const CHAIR_OPTIONS: { id: CharacterCustomization["chair"]; label: string; color: string }[] = [
  { id: "chair_black", label: "Black",  color: "#222" },
  { id: "chair_gray",  label: "Gray",   color: "#888" },
  { id: "chair_blue",  label: "Blue",   color: "#3b82f6" },
  { id: "chair_beige", label: "Beige",  color: "#c2a97e" },
  { id: "chair_red",   label: "Red",    color: "#ef4444" },
  { id: "chair_green", label: "Green",  color: "#22c55e" },
];

const COMPANY_SUGGESTIONS = [
  "Pixel Forge", "Neon Pixel", "Iron Forge", "Digital Dreams",
  "Star Byte", "Code Cave", "Indie Spark", "Dark Pixel",
];

// ── Props ────────────────────────────────────────────────────────────────────

interface Props {
  onComplete: (companyName: string, customization: CharacterCustomization) => void;
}

// ── Component ────────────────────────────────────────────────────────────────

export function NewStudioSetup({ onComplete }: Props) {
  const [name, setName] = useState("");
  const [customization, setCustomization] = useState<CharacterCustomization>(DEFAULT_CUSTOMIZATION);
  const [step, setStep] = useState<"name" | "character">("name");
  const [nameError, setNameError] = useState(false);

  const setCustom = <K extends keyof CharacterCustomization>(key: K, val: CharacterCustomization[K]) =>
    setCustomization(c => ({ ...c, [key]: val }));

  const handleNext = () => {
    if (step === "name") {
      if (!name.trim()) { setNameError(true); return; }
      setStep("character");
    } else {
      onComplete(name.trim(), customization);
    }
  };

  const handleSuggestion = () => {
    const s = COMPANY_SUGGESTIONS[Math.floor(Math.random() * COMPANY_SUGGESTIONS.length)];
    setName(s);
    setNameError(false);
  };

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 200,
      background: "rgba(8,10,18,0.97)",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontFamily: "system-ui, sans-serif",
    }}>
      {/* Subtle grid bg */}
      <div style={{
        position: "absolute", inset: 0,
        backgroundImage: "linear-gradient(rgba(251,146,60,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(251,146,60,0.04) 1px, transparent 1px)",
        backgroundSize: "40px 40px",
        pointerEvents: "none",
      }} />

      <AnimatePresence mode="wait">
        {step === "name" ? (
          <motion.div
            key="name-step"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.35 }}
            style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "2rem", padding: "2rem", maxWidth: "460px", width: "100%" }}
          >
            {/* Logo / title */}
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: "13px", fontWeight: 800, letterSpacing: "0.25em", color: "#fb923c", marginBottom: "0.5rem" }}>
                GARAGE DEV
              </div>
              <div style={{ fontSize: "28px", fontWeight: 900, color: "#f9fafb", lineHeight: 1.15, marginBottom: "0.5rem" }}>
                Found Your Studio
              </div>
              <div style={{ fontSize: "13px", color: "#6b7280", lineHeight: 1.6 }}>
                You're in your garage with $2,000 and a dream.<br />
                What are you calling your studio?
              </div>
            </div>

            {/* Name input */}
            <div style={{ width: "100%" }}>
              <input
                autoFocus
                value={name}
                onChange={e => { setName(e.target.value); setNameError(false); }}
                onKeyDown={e => { if (e.key === "Enter") handleNext(); }}
                placeholder="Studio name…"
                maxLength={32}
                style={{
                  width: "100%", boxSizing: "border-box",
                  background: "rgba(255,255,255,0.05)",
                  border: `2px solid ${nameError ? "#ef4444" : "rgba(251,146,60,0.4)"}`,
                  borderRadius: "0.75rem",
                  color: "#f9fafb", fontSize: "22px", fontWeight: 700,
                  padding: "0.75rem 1rem",
                  outline: "none",
                  textAlign: "center",
                  transition: "border-color 0.2s",
                }}
              />
              {nameError && (
                <div style={{ fontSize: "11px", color: "#ef4444", textAlign: "center", marginTop: "0.4rem" }}>
                  Please give your studio a name.
                </div>
              )}
              <button
                onClick={handleSuggestion}
                style={{
                  display: "block", margin: "0.5rem auto 0",
                  fontSize: "11px", color: "#6b7280", background: "none",
                  border: "none", cursor: "pointer", textDecoration: "underline",
                  textDecorationColor: "rgba(107,114,128,0.4)",
                }}
              >
                random suggestion
              </button>
            </div>

            {/* CTA */}
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={handleNext}
              style={{
                background: "linear-gradient(135deg, #f97316, #fb923c)",
                border: "none", borderRadius: "0.75rem",
                color: "#fff", fontSize: "15px", fontWeight: 800,
                padding: "0.75rem 2.5rem",
                cursor: "pointer", letterSpacing: "0.03em",
                boxShadow: "0 4px 24px rgba(249,115,22,0.35)",
              }}
            >
              Next — Pick Your Character →
            </motion.button>
          </motion.div>

        ) : (
          <motion.div
            key="character-step"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.35 }}
            style={{
              display: "flex", gap: "2rem", padding: "2rem",
              maxWidth: "820px", width: "100%",
              alignItems: "flex-start",
            }}
          >
            {/* Left: preview */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.75rem", flexShrink: 0 }}>
              <div style={{
                width: "200px", height: "200px",
                background: "repeating-conic-gradient(#1e2030 0% 25%, #151723 0% 50%) 0 0 / 16px 16px",
                borderRadius: "1rem", overflow: "hidden", position: "relative",
                border: "1px solid rgba(251,146,60,0.25)",
              }}>
                <CharacterComposite
                  customization={customization}
                  workState="idle"
                  devMode={true}
                  style={{ width: "100%", paddingBottom: "100%" }}
                />
              </div>
              <div style={{ fontSize: "11px", color: "#6b7280" }}>
                {name || "Your Studio"}
              </div>
            </div>

            {/* Right: options */}
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "1.25rem", minWidth: 0 }}>

              <div>
                <div style={{ fontSize: "18px", fontWeight: 900, color: "#f9fafb", marginBottom: "0.25rem" }}>
                  Customize Your Dev
                </div>
                <div style={{ fontSize: "12px", color: "#6b7280" }}>
                  You can change this later from the Customize button.
                </div>
              </div>

              {/* Skin tone */}
              <div>
                <div style={{ fontSize: "9px", fontWeight: 800, letterSpacing: "0.12em", color: "#9ca3af", marginBottom: "0.4rem" }}>SKIN TONE</div>
                <div style={{ display: "flex", gap: "0.4rem" }}>
                  {SKIN_SWATCHES.map(({ tone, hex }) => (
                    <button
                      key={tone}
                      onClick={() => setCustom("skin", tone)}
                      style={{
                        width: "26px", height: "26px", borderRadius: "50%",
                        background: hex, cursor: "pointer", outline: "none",
                        border: `3px solid ${customization.skin === tone ? "#fbbf24" : "transparent"}`,
                        boxShadow: customization.skin === tone ? "0 0 0 1px #92400e" : "none",
                        transition: "all 0.12s",
                      }}
                    />
                  ))}
                </div>
              </div>

              {/* Hair */}
              <div>
                <div style={{ fontSize: "9px", fontWeight: 800, letterSpacing: "0.12em", color: "#9ca3af", marginBottom: "0.4rem" }}>HAIR</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "0.3rem" }}>
                  {HAIR_OPTIONS.map(({ id, label, color }) => {
                    const active = customization.hair === id;
                    return (
                      <button
                        key={id}
                        onClick={() => setCustom("hair", id)}
                        style={{
                          display: "flex", alignItems: "center", gap: "0.3rem",
                          fontSize: "10px", fontWeight: 600, cursor: "pointer",
                          background: active ? "rgba(146,64,14,0.5)" : "rgba(31,41,55,0.6)",
                          border: `1px solid ${active ? "#92400e" : "rgba(55,65,81,0.5)"}`,
                          borderRadius: "0.4rem", padding: "0.2rem 0.5rem",
                          color: active ? "#fbbf24" : "#9ca3af",
                          transition: "all 0.12s",
                        }}
                      >
                        <span style={{ width: "10px", height: "10px", borderRadius: "50%", background: color, display: "inline-block", flexShrink: 0 }} />
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Clothing */}
              <div>
                <div style={{ fontSize: "9px", fontWeight: 800, letterSpacing: "0.12em", color: "#9ca3af", marginBottom: "0.4rem" }}>CLOTHING</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "0.3rem" }}>
                  {CLOTHING_OPTIONS.map(({ id, label }) => {
                    const active = customization.clothing === id;
                    return (
                      <button
                        key={id}
                        onClick={() => setCustom("clothing", id)}
                        style={{
                          fontSize: "10px", fontWeight: 600, cursor: "pointer",
                          background: active ? "rgba(146,64,14,0.5)" : "rgba(31,41,55,0.6)",
                          border: `1px solid ${active ? "#92400e" : "rgba(55,65,81,0.5)"}`,
                          borderRadius: "0.4rem", padding: "0.2rem 0.5rem",
                          color: active ? "#fbbf24" : "#9ca3af",
                          transition: "all 0.12s",
                        }}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Chair */}
              <div>
                <div style={{ fontSize: "9px", fontWeight: 800, letterSpacing: "0.12em", color: "#9ca3af", marginBottom: "0.4rem" }}>CHAIR</div>
                <div style={{ display: "flex", gap: "0.4rem" }}>
                  {CHAIR_OPTIONS.map(({ id, label, color }) => {
                    const active = customization.chair === id;
                    return (
                      <button
                        key={id}
                        title={label}
                        onClick={() => setCustom("chair", id)}
                        style={{
                          width: "22px", height: "22px", borderRadius: "0.3rem",
                          background: color, cursor: "pointer", outline: "none",
                          border: `2px solid ${active ? "#fbbf24" : "transparent"}`,
                          boxShadow: active ? "0 0 0 1px #92400e" : "none",
                          transition: "all 0.12s",
                        }}
                      />
                    );
                  })}
                </div>
              </div>

              {/* Actions */}
              <div style={{ display: "flex", gap: "0.75rem", alignItems: "center", marginTop: "0.25rem" }}>
                <button
                  onClick={() => setStep("name")}
                  style={{
                    background: "none", border: "1px solid rgba(55,65,81,0.6)",
                    borderRadius: "0.6rem", color: "#6b7280",
                    fontSize: "12px", fontWeight: 600,
                    padding: "0.55rem 1rem", cursor: "pointer",
                  }}
                >
                  ← Back
                </button>
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={handleNext}
                  style={{
                    flex: 1,
                    background: "linear-gradient(135deg, #f97316, #fb923c)",
                    border: "none", borderRadius: "0.75rem",
                    color: "#fff", fontSize: "14px", fontWeight: 800,
                    padding: "0.65rem 1rem",
                    cursor: "pointer",
                    boxShadow: "0 4px 24px rgba(249,115,22,0.35)",
                  }}
                >
                  Start {name || "Your Studio"} 🚀
                </motion.button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
