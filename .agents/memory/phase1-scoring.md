---
name: Phase 1 scoring modifiers
description: How repeat penalty, sequel timing penalty, and sequel engine bonus are computed and applied to the review score
---

## Rules

- **Repeat penalty** (−0.4): triggered when the new project has the same `genre` AND `topic` as the most recently released game, and is NOT a sequel. Checked at `releaseGame()` time using `historyRef.current`.
- **Sequel-too-soon penalty** (−0.4): triggered when `project.isSequel === true` and the weeks elapsed since the original game's release (`sequelAbsWeek`) is < 40.
- **Sequel better-engine bonus** (+0.2): triggered when `project.isSequel === true` AND `upgrades.has("betterPC")`.

## How to apply

All three are passed as a `ReviewOpts` object (4th parameter) to `generateReview()`. The function adds them to `raw` before clamping to [1, 10]:

```ts
const score = Math.max(1.0, Math.min(10.0, raw + repeatPen + sequelPen + sequelBon));
```

The same flags (`repeatPenalty`, `sequelTooSoon`, `sequelBonus`) are returned on `ReviewResult` so `buildDiagnosis()` can add explanation lines.

## Project fields added for sequel tracking

`Project` has: `isSequel?`, `sequelOfId?`, `sequelOriginalWeek?`, `sequelOriginalYear?`

Week elapsed = `((releaseYear - sequelOriginalYear) * 52 + (releaseWeek - sequelOriginalWeek))`

## Form preview

Derived vars in the component: `formRepeatPenalty`, `formSequelWeeks`, `formSequelTooSoon`, `formSequelBetterEngine`, `sequelCandidates` (games with score >= 5).

**Why:** Following GDT_FEATURE_PLAN.md Phase 1 design — these modifiers teach the player to diversify combos and time sequels strategically.
