import assert from "node:assert/strict";

import {
  createActiveMarketGame,
  generateScoreRollFrames,
  processActiveMarketGames,
  reviewMultiplierForScore,
  type ActiveMarketGame,
} from "./market.ts";
import { createGameEventBus, type GameEvent } from "./gameEvents.ts";

function fixedRandom(values: number[]) {
  let index = 0;
  return () => {
    const value = values[index] ?? values[values.length - 1] ?? 0.5;
    index += 1;
    return value;
  };
}

{
  const frames = generateScoreRollFrames(9.6, fixedRandom([0.2, 0.9, 0.7, 0.1]));
  assert.equal(frames.at(-1), 9.6);
  assert.ok(frames.some((score) => score === 10), "excellent scores can briefly flash 10");
  assert.ok(frames.every((score) => score >= 7 && score <= 10), "excellent roll frames stay high");
}

{
  const frames = generateScoreRollFrames(4.7, fixedRandom([0.1, 0.8, 0.5, 0.2]));
  assert.equal(frames.at(-1), 4.7);
  assert.ok(frames.every((score) => score >= 1 && score <= 6.5), "low rolls stay mostly low");
}

{
  assert.ok(reviewMultiplierForScore(3.5) < reviewMultiplierForScore(6));
  assert.ok(reviewMultiplierForScore(6) < reviewMultiplierForScore(8));
  assert.ok(reviewMultiplierForScore(8) < reviewMultiplierForScore(9.5));
}

{
  const bad = createActiveMarketGame(
    {
      id: "bad",
      title: "Bug Garden",
      topic: "Horror",
      genre: "Action",
      platform: "Home Computer",
      reviewScore: 3.8,
      reviewScores: [3.5, 4, 3.8, 4.1],
      hype: 0,
      bugs: 32,
      fansAtRelease: 20,
      marketTrendMultiplier: 1,
    },
    fixedRandom([0.1]),
  );
  const excellent = createActiveMarketGame(
    {
      id: "hit",
      title: "Star Atelier",
      topic: "Space",
      genre: "RPG",
      platform: "Early Console",
      reviewScore: 9.4,
      reviewScores: [9, 9.5, 9.4, 9.7],
      hype: 8,
      bugs: 1,
      fansAtRelease: 500,
      marketTrendMultiplier: 1.3,
    },
    fixedRandom([0.9]),
  );

  assert.equal(bad.status, "active_on_market");
  assert.ok(bad.maxSalesWeeks >= 3 && bad.maxSalesWeeks <= 4);
  assert.ok(excellent.maxSalesWeeks >= 8 && excellent.maxSalesWeeks <= 10);
  assert.ok(excellent.maxSalesWeeks > bad.maxSalesWeeks);
}

{
  const baseGame: ActiveMarketGame = {
    id: "g1",
    title: "Void Eternal",
    topic: "Space",
    genre: "Action",
    platform: "Arcade Cabinet",
    reviewScore: 8.8,
    reviewScores: [9, 8.5, 9.2, 8.7],
    hype: 4,
    bugs: 2,
    fansAtRelease: 220,
    weeksOnMarket: 0,
    maxSalesWeeks: 8,
    totalUnits: 0,
    totalRevenue: 0,
    totalFansGained: 0,
    weeklySales: [],
    status: "active_on_market",
    marketTrendMultiplier: 1.2,
  };

  const { games, events, payouts } = processActiveMarketGames([baseGame], fixedRandom([0.5, 0.5]));
  assert.equal(games[0].weeksOnMarket, 1);
  assert.equal(games[0].weeklySales.length, 1);
  assert.ok(games[0].totalUnits > 0);
  assert.ok(payouts.revenue > 0);
  assert.ok(payouts.fans >= 0);
  assert.equal(events[0].type, "sales_updated");
  assert.equal(events[0].gameId, "g1");
  assert.equal((events[0] as Extract<GameEvent, { type: "sales_updated" }>).payload.week, 1);
}

{
  const game = createActiveMarketGame(
    {
      id: "tail",
      title: "Tiny Tail",
      topic: "Business",
      genre: "Simulation",
      platform: "Home Computer",
      reviewScore: 4.2,
      reviewScores: [4, 4.5, 4.1, 4.2],
      hype: 0,
      bugs: 20,
      fansAtRelease: 0,
    },
    fixedRandom([0]),
  );
  let games: ActiveMarketGame[] = [game];
  let sawFinish = false;
  for (let i = 0; i < 6; i += 1) {
    const result = processActiveMarketGames(games, fixedRandom([0.1, 0.1]));
    games = result.games;
    sawFinish ||= result.events.some((event) => event.type === "sales_finished");
  }
  assert.equal(games[0].status, "finished");
  assert.ok(sawFinish, "tail emits sales_finished");
}

{
  const bus = createGameEventBus();
  const seen: GameEvent[] = [];
  const unsubscribe = bus.subscribeGameEvent("sales_updated", (event) => seen.push(event));
  bus.emitGameEvent({ type: "sales_finished", gameId: "nope" });
  bus.emitGameEvent({
    type: "sales_updated",
    gameId: "g1",
    payload: { week: 2, units: 42, revenue: 504, fans: 3, chartValue: 42 },
  });
  unsubscribe();
  bus.emitGameEvent({
    type: "sales_updated",
    gameId: "g1",
    payload: { week: 3, units: 1, revenue: 12, fans: 0, chartValue: 1 },
  });
  assert.equal(seen.length, 1);
  assert.equal(seen[0].type, "sales_updated");
}
