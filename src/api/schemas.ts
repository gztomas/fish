import { z } from "zod";

// Narrow schemas for just the Binance combined-stream payloads we consume.
// See https://developers.binance.com/docs/binance-spot-api-docs/web-socket-streams

export const miniTickerPayloadSchema = z.object({
  e: z.literal("24hrMiniTicker"),
  E: z.number(), // event time (ms)
  s: z.string(), // symbol
  c: z.string(), // last/close price
});

export const klinePayloadSchema = z.object({
  e: z.literal("kline"),
  E: z.number(),
  s: z.string(),
  k: z.object({
    t: z.number(), // bar open time (ms)
    T: z.number(), // bar close time (ms)
    s: z.string(),
    i: z.string(), // interval
    o: z.string(),
    c: z.string(), // close price at current moment (preliminary until x=true)
    h: z.string(),
    l: z.string(),
    x: z.boolean(), // is this kline closed?
  }),
});

// Envelope for combined streams: `{ stream: string, data: <payload> }`.
export const streamEnvelopeSchema = z.object({
  stream: z.string(),
  data: z.unknown(),
});

// Ack for SUBSCRIBE / UNSUBSCRIBE control messages.
export const controlAckSchema = z.object({
  id: z.number(),
  result: z.null(),
});

export type MiniTickerPayload = z.infer<typeof miniTickerPayloadSchema>;
export type KlinePayload = z.infer<typeof klinePayloadSchema>;
