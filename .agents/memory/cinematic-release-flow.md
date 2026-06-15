---
name: Cinematic release flow
description: How the auto-advancing review + auto-running sales phase works; key state shape decisions
---

## ReleaseFlowState (current shape)
- `reviewSubPhase: "entering"|"rolling"|"settled"` — replaces old `revealStep:number`. "entering" = card slides in, "rolling" = score animates, "settled" = score shown
- `salesSpeed: 1|2` — controls interval ms (1250ms vs 650ms)
- `salesPaused: boolean` — replaces old `autoPlay:boolean` (inverted: paused=false means auto-running)
- `skippedReviews: boolean` — set true by skipReviews() to suppress watchedReviewsWithoutSkip
- Removed: `revealStep`, `autoPlay`

## Timing chain (reviews)
entering→500ms→rolling→1450ms→settled→950ms(individual)/2200ms(average)→next
Each transition is a separate setTimeout in one useEffect watching `[reviewSubPhase, reviewIndex, phase]`.
The stale-closure guard: check `cur.reviewSubPhase===sub && cur.reviewIndex===idx` before advancing.

## Score roll animation
Separate useEffect watching `[reviewSubPhase, reviewIndex]`.
Fires only when `reviewSubPhase==="rolling"`. Uses `scoreRollIntervalRef` (90ms tick, ~1350ms total).
Spread narrows as elapsed→DURATION (starts wide, converges to target).
Cleanup: clear interval on any dep change.

## Sales autoplay
useEffect watching `[salesPaused, salesSpeed, phase]`. Default is `salesPaused:false` (auto-runs on enter).
Does NOT use `autoPlayIntervalRef` — the effect manages its own interval with cleanup.

## Handlers
- `skipReviews()` — jumps straight to reaction phase, sets `skippedReviews:true`
- `fastForwardReview()` — reads from `releaseFlowRef.current` (not stale closure), advances one sub-phase
- Both use `releaseFlowRef.current` instead of state to avoid stale closure issues

**Why:** reviews needed to feel cinematic/automatic rather than click-to-reveal; sales needed to always run by default.

**How to apply:** when changing release flow timing, edit the `delay` constants in the auto-advance useEffect. When adding new review sub-phases, add to both the type union and the useEffect transition logic.
