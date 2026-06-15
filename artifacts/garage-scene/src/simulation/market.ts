import type { GameEvent, WeeklySalesPoint } from "./gameEvents";

export type ActiveMarketStatus = "active_on_market" | "finished";

export type ActiveMarketGame = {
  id: string;
  title: string;
  topic: string;
  genre: string;
  platform: string;
  reviewScore: number;
  reviewScores: number[];
  hype: number;
  bugs: number;
  fansAtRelease: number;
  weeksOnMarket: number;
  maxSalesWeeks: number;
  totalUnits: number;
  totalRevenue: number;
  totalFansGained: number;
  weeklySales: WeeklySalesPoint[];
  status: ActiveMarketStatus;
  marketTrendMultiplier?: number;
};

export type ActiveMarketGameInput = {
  id: string;
  title: string;
  topic: string;
  genre: string;
  platform: string;
  reviewScore: number;
  reviewScores: number[];
  hype: number;
  bugs: number;
  fansAtRelease: number;
  marketTrendMultiplier?: number;
};

export type MarketProcessResult = {
  games: ActiveMarketGame[];
  events: GameEvent[];
  payouts: {
    revenue: number;
    fans: number;
  };
};

const PLATFORM_SALES_MULTIPLIER: Record<string, number> = {
  "Home Computer": 1,
  "Arcade Cabinet": 1.5,
  "Early Console": 2.2,
};

const PLATFORM_FAN_MULTIPLIER: Record<string, number> = {
  "Home Computer": 1,
  "Arcade Cabinet": 1.3,
  "Early Console": 1.6,
};

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function round1(value: number) {
  return Math.round(value * 10) / 10;
}

function randomBetween(min: number, max: number, rng: () => number) {
  return min + (max - min) * rng();
}

export function reviewMultiplierForScore(score: number) {
  if (score < 5) return randomlessLerp(0.4, 0.8, clamp((score - 1) / 4, 0, 1));
  if (score < 7) return randomlessLerp(0.8, 1.2, (score - 5) / 2);
  if (score < 8.5) return randomlessLerp(1.2, 1.8, (score - 7) / 1.5);
  return randomlessLerp(1.8, 3.0, clamp((score - 8.5) / 1.5, 0, 1));
}

function randomlessLerp(min: number, max: number, pct: number) {
  return min + (max - min) * clamp(pct, 0, 1);
}

export function maxSalesWeeksForScore(score: number, rng: () => number = Math.random) {
  if (score < 5) return Math.floor(randomBetween(3, 5, rng));
  if (score < 7) return Math.floor(randomBetween(4, 6, rng));
  if (score < 8.5) return Math.floor(randomBetween(6, 8, rng));
  return Math.floor(randomBetween(8, 11, rng));
}

export function createActiveMarketGame(
  input: ActiveMarketGameInput,
  rng: () => number = Math.random,
): ActiveMarketGame {
  return {
    ...input,
    weeksOnMarket: 0,
    maxSalesWeeks: maxSalesWeeksForScore(input.reviewScore, rng),
    totalUnits: 0,
    totalRevenue: 0,
    totalFansGained: 0,
    weeklySales: [],
    status: "active_on_market",
    marketTrendMultiplier: input.marketTrendMultiplier ?? 1,
  };
}

export function generateScoreRollFrames(
  finalScore: number,
  rng: () => number = Math.random,
) {
  const target = round1(clamp(finalScore, 1, 10));
  const frames: number[] = [];
  const pushFrame = (score: number) => frames.push(round1(clamp(score, 1, 10)));

  if (target >= 8.8) {
    pushFrame(randomBetween(7.4, 9.4, rng));
    pushFrame(rng() > 0.35 ? 10 : randomBetween(8.5, 9.8, rng));
    pushFrame(randomBetween(8.1, 9.8, rng));
    pushFrame(rng() > 0.45 ? 10 : randomBetween(8.7, 9.9, rng));
  } else if (target >= 7) {
    pushFrame(randomBetween(6.4, 8.4, rng));
    pushFrame(randomBetween(7.0, 9.2, rng));
    pushFrame(randomBetween(6.8, 8.8, rng));
    pushFrame(target + randomBetween(-0.7, 0.8, rng));
  } else if (target >= 5) {
    pushFrame(randomBetween(4.8, 6.8, rng));
    pushFrame(randomBetween(5.2, 7.2, rng));
    pushFrame(randomBetween(4.6, 6.8, rng));
    pushFrame(target + randomBetween(-0.7, 0.7, rng));
  } else {
    pushFrame(randomBetween(2.4, 5.4, rng));
    pushFrame(randomBetween(3.2, 6.3, rng));
    pushFrame(randomBetween(2.2, 5.6, rng));
    pushFrame(target + randomBetween(-0.6, 0.7, rng));
  }

  frames.push(target);
  return frames;
}

function weekDecayForWeek(week: number, score: number, rng: () => number) {
  if (week <= 1) return 1;
  if (week === 2) return randomBetween(0.75, score >= 8.5 ? 0.92 : 0.9, rng);
  if (week === 3) return randomBetween(0.55, score >= 8.5 ? 0.78 : 0.75, rng);
  const base = score >= 8.5 ? 0.7 : score >= 7 ? 0.63 : score >= 5 ? 0.55 : 0.44;
  return Math.pow(base, week - 2) * randomBetween(0.88, 1.08, rng);
}

function bugPenaltyForBugs(bugs: number) {
  if (bugs <= 0) return 1;
  return 1 / (1 + bugs * 0.085);
}

export function calculateWeeklySales(
  game: ActiveMarketGame,
  rng: () => number = Math.random,
): WeeklySalesPoint {
  const week = game.weeksOnMarket + 1;
  const baseDemand = 80 + game.fansAtRelease * 0.08 + game.hype * 12;
  const reviewMultiplier = reviewMultiplierForScore(game.reviewScore);
  const platformMultiplier = PLATFORM_SALES_MULTIPLIER[game.platform] ?? 1;
  const trendMultiplier = game.marketTrendMultiplier ?? 1;
  const bugPenalty = bugPenaltyForBugs(game.bugs);
  const weekDecay = weekDecayForWeek(week, game.reviewScore, rng);
  const variance = randomBetween(0.88, 1.14, rng);

  const units = Math.max(
    0,
    Math.floor(
      baseDemand *
        reviewMultiplier *
        platformMultiplier *
        trendMultiplier *
        bugPenalty *
        weekDecay *
        variance,
    ),
  );
  const price = Math.round(6 + game.reviewScore * 1.45);
  const revenue = units * price;
  const fanRate = clamp(0.012 + game.reviewScore * 0.0065 - game.bugs * 0.0008, 0.004, 0.085);
  const fans = Math.max(
    0,
    Math.floor(units * fanRate * (PLATFORM_FAN_MULTIPLIER[game.platform] ?? 1)),
  );

  return {
    week,
    units,
    revenue,
    fans,
    chartValue: units,
  };
}

export function processActiveMarketGames(
  games: ActiveMarketGame[],
  rng: () => number = Math.random,
): MarketProcessResult {
  const events: GameEvent[] = [];
  let revenue = 0;
  let fans = 0;

  const nextGames = games.map((game) => {
    if (game.status === "finished") return game;

    const point = calculateWeeklySales(game, rng);
    const nextGame: ActiveMarketGame = {
      ...game,
      weeksOnMarket: game.weeksOnMarket + 1,
      totalUnits: game.totalUnits + point.units,
      totalRevenue: game.totalRevenue + point.revenue,
      totalFansGained: game.totalFansGained + point.fans,
      weeklySales: [...game.weeklySales, point],
    };

    revenue += point.revenue;
    fans += point.fans;
    events.push({ type: "sales_updated", gameId: game.id, payload: point });

    const tailComplete = nextGame.weeksOnMarket >= nextGame.maxSalesWeeks;
    const hasDiedOut = nextGame.weeksOnMarket >= 3 && point.units <= 2;
    if (tailComplete || hasDiedOut) {
      events.push({ type: "sales_finished", gameId: game.id });
      return { ...nextGame, status: "finished" as const };
    }

    return nextGame;
  });

  return { games: nextGames, events, payouts: { revenue, fans } };
}
