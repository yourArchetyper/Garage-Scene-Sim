---
name: Genre popularity curves
description: Each genre has a sinusoidal demand wave that independently affects sales and fans (not score)
---

## Design

Each genre has a wave defined by `{period, phase, amplitude}` in `GENRE_POP`. The multiplier is:
```
mult = 1.0 + amplitude × sin(2π × (absWeek - phase) / period)
```
Range: roughly 0.75–1.28× depending on amplitude. Applied to `baseSales` and `sqrt(mult)` to `fansGained` in `generateReview`.

## Periods and phases (all tuned so genres peak at different times early-game)

| Genre      | Period | Phase | Amplitude |
|------------|--------|-------|-----------|
| RPG        | 96wk   | 0     | 0.25      |
| Strategy   | 80wk   | 24    | 0.20      |
| Simulation | 112wk  | 48    | 0.22      |
| Action     | 72wk   | 16    | 0.28      |
| Adventure  | 88wk   | 60    | 0.20      |

## Helpers

- `genrePopularityMult(genre, absWeek)` → number (rounded to 2dp)
- `genrePopLabel(mult)` → `{label, icon, cls, barCls}` — tiers: Hot🔥 ≥1.2, Rising↑ ≥1.1, Steady ≥0.95, Cooling↓ ≥0.85, Cold🧊 <0.85

## ReviewOpts / ReviewResult

`absWeek` is passed via `ReviewOpts` (4th arg to `generateReview`). The computed `popMult` is returned as `result.genrePopMult`.

## UI

Each genre button in the New Game form shows a two-line layout: genre name + `{icon} {label}` in the appropriate color. Below the grid, a summary bar shows the selected genre's current demand and `±N% sales` delta.

**Why:** Teaches players to time their releases around genre cycles, adding strategic depth beyond combo selection alone.
