export type WeeklySalesPoint = {
  week: number;
  units: number;
  revenue: number;
  fans: number;
  chartValue: number;
};

export type GameEvent =
  | { type: "sales_updated"; gameId: string; payload: WeeklySalesPoint }
  | { type: "sales_finished"; gameId: string }
  | { type: "review_revealed"; gameId: string; outlet: string; score: number }
  | { type: "review_sequence_finished"; gameId: string };

type GameEventHandler<T extends GameEvent["type"]> = (
  event: Extract<GameEvent, { type: T }>,
) => void;

export function createGameEventBus() {
  const handlers = new Map<GameEvent["type"], Set<(event: GameEvent) => void>>();

  function emitGameEvent(event: GameEvent) {
    const eventHandlers = handlers.get(event.type);
    if (!eventHandlers) return;
    for (const handler of eventHandlers) handler(event);
  }

  function subscribeGameEvent<T extends GameEvent["type"]>(
    type: T,
    handler: GameEventHandler<T>,
  ) {
    const eventHandlers = handlers.get(type) ?? new Set<(event: GameEvent) => void>();
    eventHandlers.add(handler as (event: GameEvent) => void);
    handlers.set(type, eventHandlers);
    return () => {
      eventHandlers.delete(handler as (event: GameEvent) => void);
    };
  }

  return { emitGameEvent, subscribeGameEvent };
}
