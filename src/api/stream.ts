import ReconnectingWebSocket from "partysocket/ws";

import {
  controlAckSchema,
  klinePayloadSchema,
  miniTickerPayloadSchema,
  streamEnvelopeSchema,
  type KlinePayload,
  type MiniTickerPayload,
} from "./schemas";

export type ConnectionState = "open" | "closed";

export type StreamMessage =
  | { kind: "miniTicker"; stream: string; data: MiniTickerPayload }
  | { kind: "kline"; stream: string; data: KlinePayload };

type MessageHandler = (msg: StreamMessage) => void;
type StateHandler = (state: ConnectionState) => void;

const STREAM_URL = "wss://stream.binance.com:9443/stream";

/**
 * Singleton wrapper around a partysocket-backed WebSocket to Binance's
 * combined stream endpoint. Owns the set of active subscriptions so
 * reconnects automatically re-subscribe, and fans out validated
 * messages to listeners. Callers never talk to the raw socket.
 */
export class BinanceStreamClient {
  private ws: ReconnectingWebSocket;
  private subscribed = new Set<string>();
  private messageHandlers = new Set<MessageHandler>();
  private stateHandlers = new Set<StateHandler>();
  private state: ConnectionState = "closed";
  private nextControlId = 1;

  constructor(url: string = STREAM_URL) {
    this.ws = new ReconnectingWebSocket(url);
    this.ws.addEventListener("open", this.handleOpen);
    this.ws.addEventListener("close", this.handleClose);
    this.ws.addEventListener("error", this.handleClose);
    this.ws.addEventListener("message", this.handleMessage);
  }

  get currentState(): ConnectionState {
    return this.state;
  }

  subscribe(streams: string[]): void {
    const next = streams.filter((s) => !this.subscribed.has(s));
    if (next.length === 0) return;
    for (const s of next) this.subscribed.add(s);
    if (this.state === "open") this.sendControl("SUBSCRIBE", next);
  }

  unsubscribe(streams: string[]): void {
    const next = streams.filter((s) => this.subscribed.has(s));
    if (next.length === 0) return;
    for (const s of next) this.subscribed.delete(s);
    if (this.state === "open") this.sendControl("UNSUBSCRIBE", next);
  }

  onMessage(handler: MessageHandler): () => void {
    this.messageHandlers.add(handler);
    return () => {
      this.messageHandlers.delete(handler);
    };
  }

  onState(handler: StateHandler): () => void {
    this.stateHandlers.add(handler);
    handler(this.state);
    return () => {
      this.stateHandlers.delete(handler);
    };
  }

  close(): void {
    this.ws.close();
  }

  private handleOpen = () => {
    this.setState("open");
    // Reconnects drop server-side subscriptions; restore the full set.
    if (this.subscribed.size > 0) {
      this.sendControl("SUBSCRIBE", [...this.subscribed]);
    }
  };

  private handleClose = () => {
    this.setState("closed");
  };

  private handleMessage = (event: MessageEvent) => {
    if (typeof event.data !== "string") return;
    let parsed: unknown;
    try {
      parsed = JSON.parse(event.data);
    } catch {
      return;
    }

    const envelope = streamEnvelopeSchema.safeParse(parsed);
    if (envelope.success) {
      const mini = miniTickerPayloadSchema.safeParse(envelope.data.data);
      if (mini.success) {
        this.dispatch({
          kind: "miniTicker",
          stream: envelope.data.stream,
          data: mini.data,
        });
        return;
      }
      const kline = klinePayloadSchema.safeParse(envelope.data.data);
      if (kline.success) {
        this.dispatch({
          kind: "kline",
          stream: envelope.data.stream,
          data: kline.data,
        });
        return;
      }
      // Unknown payload for a known envelope — silently drop.
      return;
    }

    // Control ack for SUBSCRIBE/UNSUBSCRIBE — no-op.
    if (controlAckSchema.safeParse(parsed).success) return;
  };

  private sendControl(
    method: "SUBSCRIBE" | "UNSUBSCRIBE",
    params: string[],
  ): void {
    this.ws.send(JSON.stringify({ method, params, id: this.nextControlId++ }));
  }

  private setState(next: ConnectionState): void {
    if (this.state === next) return;
    this.state = next;
    for (const handler of this.stateHandlers) handler(next);
  }

  private dispatch(msg: StreamMessage): void {
    for (const handler of this.messageHandlers) handler(msg);
  }
}

let instance: BinanceStreamClient | null = null;

export function getStreamClient(): BinanceStreamClient {
  if (!instance) instance = new BinanceStreamClient();
  return instance;
}
