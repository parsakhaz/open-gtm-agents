import WebSocket from "ws";

const CDP_TIMEOUT_MS = 15_000;

type PendingCommand = {
  resolve: (value: unknown) => void;
  reject: (reason: Error) => void;
  timer: ReturnType<typeof setTimeout>;
};

export class CdpClient {
  private ws: WebSocket | null = null;
  private id = 0;
  private pending = new Map<number, PendingCommand>();
  private eventHandlers = new Map<string, Set<(params: any, msg?: any) => void>>();
  private closeHandlers = new Set<() => void>();

  async connect(wsUrl: string): Promise<void> {
    await this.close();

    return new Promise((resolve, reject) => {
      const ws = new WebSocket(wsUrl);
      this.ws = ws;

      ws.on("open", () => resolve());
      ws.on("error", (error) => reject(error));
      ws.on("close", () => {
        for (const handler of this.closeHandlers) handler();
      });
      ws.on("message", (data) => this.handleMessage(data));
    });
  }

  send(
    method: string,
    params: Record<string, unknown> = {},
    sessionId?: string,
  ): Promise<any> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return Promise.reject(new Error("CDP WebSocket not connected."));
    }

    const id = ++this.id;
    const message: Record<string, unknown> = { id, method, params };
    if (sessionId) message.sessionId = sessionId;

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`CDP command timed out: ${method}`));
      }, CDP_TIMEOUT_MS);

      this.pending.set(id, { resolve, reject, timer });
      this.ws?.send(JSON.stringify(message));
    });
  }

  onEvent(method: string, handler: (params: any, msg?: any) => void) {
    if (!this.eventHandlers.has(method)) {
      this.eventHandlers.set(method, new Set());
    }

    this.eventHandlers.get(method)?.add(handler);

    return () => {
      const handlers = this.eventHandlers.get(method);
      handlers?.delete(handler);
      if (handlers?.size === 0) this.eventHandlers.delete(method);
    };
  }

  waitForEvent(method: string, timeoutMs: number, sessionId?: string) {
    let off: (() => void) | undefined;
    let timer: ReturnType<typeof setTimeout>;

    const promise = new Promise((resolve, reject) => {
      off = this.onEvent(method, (params, msg) => {
        if (sessionId && msg?.sessionId !== sessionId) return;
        clearTimeout(timer);
        off?.();
        resolve(params);
      });

      timer = setTimeout(() => {
        off?.();
        reject(new Error(`Timed out waiting for CDP event: ${method}`));
      }, timeoutMs);
    });

    return {
      promise,
      cancel() {
        clearTimeout(timer);
        off?.();
      },
    };
  }

  onClose(handler: () => void) {
    this.closeHandlers.add(handler);
  }

  async close() {
    for (const pending of this.pending.values()) {
      clearTimeout(pending.timer);
      pending.reject(new Error("CDP connection closed."));
    }
    this.pending.clear();

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  private handleMessage(data: WebSocket.RawData) {
    const msg = JSON.parse(typeof data === "string" ? data : data.toString());

    if (msg.id && this.pending.has(msg.id)) {
      const pending = this.pending.get(msg.id)!;
      this.pending.delete(msg.id);
      clearTimeout(pending.timer);

      if (msg.error) {
        pending.reject(new Error(msg.error.message || JSON.stringify(msg.error)));
      } else {
        pending.resolve(msg.result);
      }
      return;
    }

    if (msg.method) {
      const handlers = this.eventHandlers.get(msg.method);
      if (!handlers) return;
      for (const handler of [...handlers]) {
        handler(msg.params || {}, msg);
      }
    }
  }
}
