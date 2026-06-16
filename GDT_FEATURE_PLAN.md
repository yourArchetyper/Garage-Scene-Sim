# Garage Scene — Feature Plan
## Based on Game Dev Tycoon source analysis + current state audit

> Last updated: June 2026
> Source: `attached_assets/un_1781606698596.js` (120k-line GDT build, minified)

---

## What Garage Scene already has (baseline)

| System | Status |
|---|---|
| Week-based time loop | ✅ |
| Develop a game (progress bar) | ✅ |
| Genre selection | ✅ |
| Game size selection (small/medium/large/AAA) | ✅ |
| Cinematic review reveal (score 1–10, rolling counter, star ratings) | ✅ |
| Market trend system | ✅ |
| Cash + fans tracking | ✅ |
| Live post-release sales (weekly ticks, salesSpeed 1×/2×) | ✅ |
| Upgrade shop | ✅ |
| Developer sprite at computer | ✅ |

---

## Part 1 — The Core Scoring Engine (GDT's Heart)

GDT's entire strategy layer sits on three interlocking levers. These are what make "pick a topic + genre" a meaningful decision rather than a cosmetic one.

### 1A. Topic + Genre Combo Weighting

**What GDT does:**
Every topic has a `genreWeightings` array — 6 values, one per genre [Action, Adventure, RPG, Simulation, Strategy, Casual]. Values run 0.6 (terrible) → 1.0 (great). This weight is a direct multiplier on the final review score.

```
Multiplier examples from GDT source:
  "Zombie + Action"      → 1.0 × score  (great)
  "Zombie + Simulation"  → 0.6 × score  (terrible)
  "Fantasy + RPG"        → 1.0 × score  (great)
  "Fantasy + Strategy"   → 0.7 × score  (weak)
```

The matching also appears verbatim in review text:
- `"[Topic] and [Genre] is a great combination."` → pushes into positive quotes
- `"[Topic] and [Genre] is a terrible combination."` → pushes into negative quotes

**What Garage Scene needs:**
- Assign each topic a `genreWeightings: [6 floats]` array in `market.ts` or a new `topics.ts`
- During score calculation, multiply by `genreWeightings[genreIndex]`
- Surface the combo quality to the player visually (green/amber/red indicator in the project creation UI)
- Include the combo verdict in the review quote pool

**Why this matters:** Without it, genre and topic are purely cosmetic. With it, players learn "combos" and plan deliberately — the main strategy loop of GDT.

---

### 1B. Design / Technology Golden Ratio

**What GDT does:**
Each genre has a target T:D ratio (the "golden ratio"):

| Genre | Target T:D ratio | Character |
|---|---|---|
| Action | 1.8 | Tech-heavy |
| Simulation | 1.6 | Tech-heavy |
| Strategy | 1.4 | Slightly tech-heavy |
| RPG | 0.6 | Design-heavy |
| Casual | 0.5 | Design-heavy |
| Adventure | 0.4 | Design-heavy |

During development, each phase generates D or T points based on a `designFactor` / `technologyFactor` per phase. The final ratio is compared against the genre's golden ratio:
- Within 25% of golden ratio → **+0.1 score bonus**
- More than 50% off → **-0.1 score penalty**

**What Garage Scene needs:**
Right now development is a single progress bar. Split it into two accumulating bars: **Design Points** and **Tech Points**. During development phases the player chooses a focus (or phases auto-contribute), shifting the balance.

Implementation path:
1. Add `designPoints` and `techPoints` to the in-progress game state
2. Each week of dev ticks both up based on the current phase's D/T split
3. At release, compute `ratio = techPoints / designPoints`; compare to `genre.goldenRatio`
4. Apply ±0.1 modifier to score
5. Show the T/D balance as a visual split bar in the development UI

**Why this matters:** Gives meaning to the development phase beyond "wait for bar to fill". Players can see they're making a design-heavy RPG and check whether they're on track.

---

### 1C. Development Phases with Focus Areas

**What GDT does:**
GDT has 9 phases per game (Preparation + 7 main development phases + BugFixing). Each of the 7 main phases maps to a focus area with genre-weighted importance:

Based on the source, the 7 main phases correspond to game development areas. Each phase has a `percentage` (how much of game time it takes) and `designFactor`/`technologyFactor`.

**What Garage Scene needs (simplified):**
Replace the single "working..." bar with 3–4 phases the player explicitly moves through:

| Phase | D/T bias | Player choice |
|---|---|---|
| Pre-production | neutral | none |
| Core development | genre-dependent | Focus: Gameplay, Story, Graphics, AI, Sound |
| Polish & bugfix | design-heavy | auto |

The player's focus choice within each phase shifts D vs T point accumulation. Wrong choices for the genre = suboptimal ratio = score penalty.

---

## Part 2 — Sequel System

**What GDT does:**
Any game can be made a sequel to a previous game if they share topic + genre. Key rules:

- **Too soon** (< 40 weeks since original): `-0.4 score penalty` — reviewer says "Didn't we just play [title] recently?"
- **Same engine as sequel**: `-0.1 score penalty`
- **Better engine than original**: `+0.2 score bonus`
- **Score ≥ 7 sequel**: significant fan gain bonus (loyal series fans)
- **Score < 5 sequel**: fan loss (disappointed sequel buyers)
- Generates a dedicated news story when released

**What Garage Scene needs:**
- Tag each completed game with `{ id, title, genre, topic, releaseWeek, score }`
- In the new project flow, offer "Make sequel to [title]" if a previous same-genre/topic game exists
- Apply the timing penalty if < 40 weeks have passed
- Show the parent game's score in the UI as context

**Why this matters:** Creates a "game series" meta-loop — players want to build a franchise but must space releases properly and keep upgrading their engine. Low effort to implement, high strategic depth payoff.

---

## Part 3 — Hype System

**What GDT does:**
`hypePoints` is a pre-release currency that directly multiplies launch-week sales:

```javascript
// At release:
initialSalesBonus = Math.floor(hypePoints * getCurrentGameProgress())

// Each week post-release:
if (hypePoints > 0) hypePoints--
```

Hype is built by:
- Conference booths (4 tiers, different standFactor multipliers)
- Accepting media interview events
- Certain research unlocks flagging `nextGameHypeBonus`

**What Garage Scene needs:**
- Add `hypePoints: number` to the in-progress game state
- Wire one or two sources to build it during development (e.g., a "Run marketing campaign" action costing money, or an event card)
- At release, apply a `1 + hypePoints * 0.01` multiplier to week-1 sales
- Show a hype meter in the dev UI

**Why this matters:** Right now there's no way for the player to invest in a launch. Hype gives a cash-spending decision during development that pays off at release.

---

## Part 4 — Random Events

**What GDT does:**
GDT fires narrative events based on game state triggers:

| Event | Trigger condition | Player choice | Consequence |
|---|---|---|---|
| Patent troll | cash > 2M, has 3+ engines | Pay / Fight | Lose cash or lose time |
| Old engine open-source | Engine is outdated | Release / Sell license / Refuse | Hype / cash / nothing |
| Media interview | Random, ~1× per game | Accept / Decline | +hype or nothing |
| Same genre/topic | Same genre+topic as last game | (narrative only) | -0.4 score, news story |
| Piracy report | Low-scoring game | (narrative only) | Fan mood flavor text |

**What Garage Scene needs:**
A lightweight `EventQueue` system (similar to the existing notifications) that can fire during the dev loop:

1. **Interview request** — "A gaming blog wants to interview you. Agree?" → +hype / +slight fan boost
2. **Crunch decision** — "The game needs more work. Crunch the team?" → finish faster / -efficiency next game
3. **Tech debt notice** — "Your engine is getting long in the tooth." → narrative pressure to build new engine

Start with 2–3 events. The important thing is the trigger + binary choice + consequence pattern.

---

## Part 5 — Repeat Penalty (Same Genre+Topic)

**What GDT does:**
If the last released game had the exact same `genre + topic` combination:
```javascript
s += -0.4  // score modifier
g.flags.sameGenreTopic = true
// reviewer says: "Another [Genre]/[Topic] game?"
```

This is one of GDT's most effective anti-farming tools. It forces genre rotation.

**What Garage Scene needs:**
- Track `lastGameGenre` + `lastGameTopic` in company state
- At score calc, check match → apply -0.4 modifier
- Add "Another [genre]/[topic] game?" to the negative review quote pool

**Why this matters:** Without this, the optimal strategy is to spam the same winning combo forever. This single rule forces genre variety and keeps the game interesting long-term.

---

## Part 6 — Audience Targeting

**What GDT does:**
Each topic has 3 `audienceWeightings`: `[young, everyone, mature]`. The player picks a target audience at project creation. If topic and audience mismatch badly (< 0.6):

```
Reviewer says: "[Topic] is a horrible topic for [audience] audiences."
Score multiplied by audience weight (0.6–1.0)
```

**What Garage Scene needs:**
- Add "Target Audience" picker to project creation (Young / Everyone / Mature)
- Assign audience weights to topics
- Apply in score calc
- Include in review comments

This is low implementation cost — the data structure mirrors topic+genre combo. It adds a third strategic axis.

---

## Part 7 — Engine System (Longer-term)

**What GDT does:**
Custom engines are developed separately from games. They have:
- A `techLevel` that caps the game sizes you can release
- `technologyPoints` that boost all games made with the engine
- Parts research (e.g., `MultiPlatformOptimized` reduces multi-platform costs)
- An `engineAge` — old engines hurt score if used for sequels without upgrade
- License options: sell, give away, keep

**What Garage Scene needs (MVP version):**
- A simple engine tier system: `Basic → Improved → Advanced → Cutting Edge`
- Upgrading costs cash + time (takes a few weeks)
- Engine tier sets a cap on max game size
- Each tier adds a flat bonus to T points per game
- Display current engine in the studio UI

**Why this matters:** Creates a mid-game investment loop. Players save cash to upgrade their engine, unlocking AAA games and better scores.

---

## Part 8 — Platform System (Longer-term)

**What GDT does:**
Each platform has:
- `genreWeightings[6]` — platform-genre affinity (same structure as topics)
- A lifecycle: launch → peak → decline → discontinued
- Market share changes each week
- New platforms announced via in-game news stories

GDT's scoring penalizes releasing a game on a platform where that genre performs poorly.

**What Garage Scene needs (MVP version):**
- The market trend system already has some of this
- Extend it: each platform (PC, Handheld, Console) has a genre affinity table
- Apply a ×0.85–×1.15 score modifier based on platform+genre match
- Show platform market share trending up/down in the UI

---

## Implementation Priority

| Priority | Feature | Effort | Gameplay impact |
|---|---|---|---|
| 🔴 P1 | Topic + Genre combo weighting | Low | ⭐⭐⭐⭐⭐ |
| 🔴 P1 | Repeat genre+topic penalty | Very Low | ⭐⭐⭐⭐⭐ |
| 🔴 P1 | Sequel system (basic) | Medium | ⭐⭐⭐⭐ |
| 🟡 P2 | Design / Tech golden ratio (split points) | Medium | ⭐⭐⭐⭐ |
| 🟡 P2 | Hype system + one marketing action | Low–Medium | ⭐⭐⭐ |
| 🟡 P2 | Random events (interview + crunch) | Medium | ⭐⭐⭐ |
| 🟡 P2 | Audience targeting | Low | ⭐⭐⭐ |
| 🟢 P3 | Development phases with focus choices | High | ⭐⭐⭐⭐ |
| 🟢 P3 | Engine tier system | Medium | ⭐⭐⭐⭐ |
| 🟢 P3 | Platform genre affinity | Medium | ⭐⭐⭐ |

---

## Key Differences vs GDT (what NOT to copy)

- **9 development phases with manual sliders** — too much friction for a browser idle game. Simplify to 3 phases max, or make it fully auto with light choices.
- **Conference booth system** — interesting but complex. Absorb as a simple "run marketing event" action instead.
- **Custom hardware / GamePhone** — late-game GDT content, not relevant yet.
- **Piracy system** — great flavor but only worth adding after the core loop is solid.
- **Staff hiring and specializations** — GDT's mid-game expander. Worth planning but not near-term.
- **MMO mode** — niche, adds huge complexity.

---

## Data Changes Required

### `market.ts` additions:
```typescript
// Add to each topic:
genreWeightings: [number, number, number, number, number, number]  // [Action, Adventure, RPG, Sim, Strategy, Casual]
audienceWeightings: [number, number, number]  // [young, everyone, mature]
```

### New `genres.ts` constants:
```typescript
goldenRatio: number          // target T:D ratio per genre
genreIndex: 0|1|2|3|4|5     // for weighting array lookup
```

### Game state additions:
```typescript
// In-progress game:
designPoints: number
techPoints: number
hypePoints: number
sequelTo?: string            // id of parent game

// Completed game:
topic: string
genre: string
releaseWeek: number
score: number
```

### Company state additions:
```typescript
lastGame: { genre: string; topic: string; releaseWeek: number } | null
engineTier: 1 | 2 | 3 | 4
```

---

## Score Formula (proposed for Garage Scene)

```
baseScore = rawProgress * engineBonus

comboMultiplier  = topicGenreWeighting(topic, genre)        // 0.6 – 1.0
audienceMultiplier = audienceWeighting(topic, audience)     // 0.6 – 1.0
ratioBonus       = goldenRatioBonus(techPoints, designPoints, genre)  // -0.1 – +0.1
trendMultiplier  = marketTrendFactor(genre)                 // existing system
bugPenalty       = 1 - 0.8 * (bugs / totalPoints)          // 0.2 – 1.0

repeatPenalty    = (sameGenreTopic as last game) ? -0.4 : 0
sequelPenalty    = (sequelTooSoon) ? -0.4 : 0
sequelBonus      = (betterEngine than original) ? +0.2 : 0

rawScore = baseScore
  * comboMultiplier
  * audienceMultiplier
  * trendMultiplier
  * bugPenalty
  + ratioBonus + repeatPenalty + sequelPenalty + sequelBonus

finalScore = clamp(rawScore, 1, 10)
```

This is directly derived from the GDT source formula, simplified for a single-platform single-staff idle game.
