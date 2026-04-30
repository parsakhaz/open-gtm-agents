import type {
  BrowserCommand,
  BrowserConnectionStatus,
  CommandResult,
} from "../src/lib/browser-relay/types";
import type { CdpClient } from "./cdp-client";

const NAVIGATION_TIMEOUT_MS = 30_000;
const INTERACTIVE_ROLES = new Set([
  "button",
  "link",
  "textbox",
  "searchbox",
  "combobox",
  "checkbox",
  "radio",
  "switch",
  "tab",
  "menuitem",
  "option",
  "listitem",
]);

type AxNode = {
  nodeId: string;
  parentId?: string;
  role?: { value?: string };
  name?: { value?: string };
  value?: { value?: string };
  focused?: boolean;
  disabled?: boolean;
  selected?: boolean;
  checked?: { value?: string };
  childIds?: string[];
  backendDOMNodeId?: number;
};

type RefEntry = {
  backendDOMNodeId: number;
  role: string;
  name: string;
};

export class CdpCommands {
  private sessions = new Map<string, string>();
  private refMaps = new Map<string, Map<number, string>>();
  private reverseRefMaps = new Map<string, Map<string, RefEntry>>();
  private nextRefId = new Map<string, number>();

  constructor(private cdp: CdpClient) {}

  async execute(command: BrowserCommand): Promise<CommandResult> {
    switch (command.name) {
      case "list_tabs":
        return this.listTabs();
      case "new_tab":
        return this.newTab(command.url);
      case "snap":
        return this.snapshot(command.tabId, command.mode);
      case "screenshot":
        return this.screenshot(command.tabId);
      case "navigate":
        return this.navigate(command.tabId, command.url);
      case "click_element":
        return this.clickElement(command.tabId, command.index);
      case "clickxy":
        return this.clickXy(command.tabId, command.x, command.y);
      case "type_text":
        return this.typeText(command.tabId, command.text);
      case "press_key":
        return this.pressKey(command.tabId, command.key);
      case "scroll":
        return this.scroll(command.tabId, command.direction, command.amount);
      case "wait_for_text":
        return this.waitForText(command.tabId, command.text, command.timeoutMs);
      case "wait_for_url":
        return this.waitForUrl(command.tabId, command.pattern, command.timeoutMs);
    }
  }

  async status(): Promise<BrowserConnectionStatus> {
    return {
      enabled: true,
      connected: true,
    };
  }

  async cleanup() {
    for (const sessionId of this.sessions.values()) {
      await this.cdp.send("Target.detachFromTarget", { sessionId }).catch(() => {});
    }
    this.sessions.clear();
    this.refMaps.clear();
    this.reverseRefMaps.clear();
    this.nextRefId.clear();
  }

  private async getSession(targetId: string) {
    const existing = this.sessions.get(targetId);
    if (existing) return existing;

    const result = await this.cdp.send("Target.attachToTarget", {
      targetId,
      flatten: true,
    });
    const sessionId = result.sessionId as string;
    this.sessions.set(targetId, sessionId);
    await this.cdp.send("Page.enable", {}, sessionId).catch(() => {});
    await this.cdp
      .send("Emulation.setFocusEmulationEnabled", { enabled: true }, sessionId)
      .catch(() => {});
    return sessionId;
  }

  private async listTabs(): Promise<CommandResult> {
    try {
      const { targetInfos } = await this.cdp.send("Target.getTargets");
      const pages = (targetInfos as Array<{ targetId: string; title: string; url: string; type: string }>)
        .filter((target) => target.type === "page")
        .filter(
          (target) =>
            !target.url.startsWith("devtools://") &&
            (!target.url.startsWith("chrome://") || target.url.startsWith("chrome://newtab")) &&
            (!target.url.startsWith("edge://") || target.url.startsWith("edge://newtab")),
        );

      return {
        ok: true,
        result: pages
          .map((page) => `${page.targetId}  ${page.title || "(untitled)"}  ${page.url}`)
          .join("\n"),
      };
    } catch (error) {
      return failure(error);
    }
  }

  private async newTab(url?: string): Promise<CommandResult> {
    try {
      const result = await this.cdp.send("Target.createTarget", {
        url: url ?? "about:blank",
      });
      return {
        ok: true,
        result: result.targetId as string,
      };
    } catch (error) {
      return failure(error);
    }
  }

  private async navigate(targetId: string, url: string): Promise<CommandResult> {
    try {
      const sessionId = await this.getSession(targetId);
      const loadEvent = this.cdp.waitForEvent(
        "Page.loadEventFired",
        NAVIGATION_TIMEOUT_MS,
        sessionId,
      );
      const result = await this.cdp.send("Page.navigate", { url }, sessionId);
      if (result.errorText) {
        loadEvent.cancel();
        return { ok: false, error: String(result.errorText) };
      }
      await loadEvent.promise.catch(() => undefined);
      return { ok: true, result: `Navigated to ${url}` };
    } catch (error) {
      return failure(error);
    }
  }

  private async snapshot(
    targetId: string,
    mode: "interactive" | "full" = "interactive",
  ): Promise<CommandResult> {
    try {
      const sessionId = await this.getSession(targetId);
      await this.cdp.send("DOM.enable", {}, sessionId);
      const [axResult, urlResult] = await Promise.all([
        this.cdp.send("Accessibility.getFullAXTree", {}, sessionId),
        this.cdp
          .send(
            "Runtime.evaluate",
            { expression: "window.location.href", returnByValue: true },
            sessionId,
          )
          .catch(() => ({ result: { value: "" } })),
      ]);

      const nodes = axResult.nodes as AxNode[];
      this.reverseRefMaps.delete(targetId);

      const lines: string[] = [];
      let count = 0;
      let focusedLine = "";

      for (const node of nodes) {
        const role = node.role?.value ?? "";
        const name = node.name?.value ?? node.value?.value ?? "";
        const backendDOMNodeId = node.backendDOMNodeId;
        if (!role || !name || backendDOMNodeId == null) continue;
        if (mode === "interactive" && !INTERACTIVE_ROLES.has(role)) continue;

        const ref = this.refFor(targetId, backendDOMNodeId);
        this.setReverseRef(targetId, ref, { backendDOMNodeId, role, name });
        count++;

        const states: string[] = [];
        if (node.focused) states.push("focused");
        if (node.disabled) states.push("disabled");
        if (node.selected) states.push("selected");
        if (node.checked?.value === "true") states.push("checked");
        const line = `[${ref}] ${role} "${name}"${states.length ? ` (${states.join(", ")})` : ""}`;
        if (node.focused) focusedLine = `Focused: ${line}`;
        lines.push(line);
      }

      const pageUrl = String(urlResult.result?.value ?? "");
      const header = [`URL: ${pageUrl}`, `Page has ${count} elements:`];
      if (focusedLine) header.push(focusedLine);
      return { ok: true, result: `${header.join("\n")}\n${lines.join("\n")}` };
    } catch (error) {
      return failure(error);
    }
  }

  private async screenshot(targetId: string): Promise<CommandResult> {
    try {
      const sessionId = await this.getSession(targetId);
      const [shot, metricsResult] = await Promise.all([
        this.cdp.send("Page.captureScreenshot", { format: "jpeg", quality: 82 }, sessionId),
        this.cdp.send(
          "Runtime.evaluate",
          {
            expression:
              "JSON.stringify({ dpr: window.devicePixelRatio, width: window.innerWidth, height: window.innerHeight })",
            returnByValue: true,
          },
          sessionId,
        ),
      ]);
      const metrics = JSON.parse(String(metricsResult.result?.value ?? "{}"));
      return {
        ok: true,
        result: `__SCREENSHOT_META__${JSON.stringify(metrics)}__${shot.data}`,
      };
    } catch (error) {
      return failure(error);
    }
  }

  private async clickElement(targetId: string, ref: string): Promise<CommandResult> {
    try {
      const entry = this.reverseRefMaps.get(targetId)?.get(ref);
      if (!entry) {
        return { ok: false, error: `Element ${ref} not found. Run snap again.` };
      }

      const sessionId = await this.getSession(targetId);
      await this.cdp.send("DOM.enable", {}, sessionId);
      await this.cdp.send(
        "DOM.scrollIntoViewIfNeeded",
        { backendNodeId: entry.backendDOMNodeId },
        sessionId,
      );
      const box = await this.cdp.send(
        "DOM.getBoxModel",
        { backendNodeId: entry.backendDOMNodeId },
        sessionId,
      );

      if (!box.model?.content) {
        return { ok: false, error: `Could not get box for ${ref}.` };
      }

      const quad = box.model.content as number[];
      const x = (quad[0] + quad[2] + quad[4] + quad[6]) / 4;
      const y = (quad[1] + quad[3] + quad[5] + quad[7]) / 4;
      const result = await this.clickXy(targetId, x, y);
      return {
        ...result,
        result: result.ok ? `Clicked [${ref}] ${entry.role} "${entry.name}"` : result.result,
      };
    } catch (error) {
      return failure(error);
    }
  }

  private async clickXy(targetId: string, x: number, y: number): Promise<CommandResult> {
    try {
      const sessionId = await this.getSession(targetId);
      const base = { x, y, button: "left", clickCount: 1, modifiers: 0 };
      await this.cdp.send("Input.dispatchMouseEvent", { ...base, type: "mouseMoved" }, sessionId);
      await this.cdp.send("Input.dispatchMouseEvent", { ...base, type: "mousePressed" }, sessionId);
      await new Promise((resolve) => setTimeout(resolve, 50));
      await this.cdp.send("Input.dispatchMouseEvent", { ...base, type: "mouseReleased" }, sessionId);
      return { ok: true, result: `Clicked at ${Math.round(x)}, ${Math.round(y)}` };
    } catch (error) {
      return failure(error);
    }
  }

  private async typeText(targetId: string, text: string): Promise<CommandResult> {
    try {
      const sessionId = await this.getSession(targetId);
      await this.cdp.send("Input.insertText", { text }, sessionId);
      return { ok: true, result: `Typed ${text.length} characters` };
    } catch (error) {
      return failure(error);
    }
  }

  private async pressKey(targetId: string, key: string): Promise<CommandResult> {
    try {
      const sessionId = await this.getSession(targetId);
      const params = keyParams(key);
      await this.cdp.send("Input.dispatchKeyEvent", { type: "keyDown", ...params }, sessionId);
      await this.cdp.send(
        "Input.dispatchKeyEvent",
        { type: "keyUp", ...params, text: undefined },
        sessionId,
      );
      return { ok: true, result: `Pressed ${key}` };
    } catch (error) {
      return failure(error);
    }
  }

  private async scroll(
    targetId: string,
    direction: "up" | "down" = "down",
    amount = 650,
  ): Promise<CommandResult> {
    try {
      const sessionId = await this.getSession(targetId);
      const delta = direction === "up" ? -amount : amount;
      const result = await this.cdp.send(
        "Runtime.evaluate",
        {
          expression: `window.scrollBy(0, ${delta}); Math.round(window.scrollY)`,
          returnByValue: true,
        },
        sessionId,
      );
      return { ok: true, result: `Scrolled ${direction}. scrollY=${result.result?.value ?? "?"}` };
    } catch (error) {
      return failure(error);
    }
  }

  private async waitForText(
    targetId: string,
    text: string,
    timeoutMs = 10_000,
  ): Promise<CommandResult> {
    return this.pollUntil(targetId, timeoutMs, `text "${text}"`, async (sessionId) => {
      const result = await this.cdp.send(
        "Runtime.evaluate",
        {
          expression: `(document.body?.innerText || "").includes(${JSON.stringify(text)})`,
          returnByValue: true,
        },
        sessionId,
      );
      return result.result?.value === true;
    });
  }

  private async waitForUrl(
    targetId: string,
    pattern: string,
    timeoutMs = 10_000,
  ): Promise<CommandResult> {
    const regex = globToRegExp(pattern);
    return this.pollUntil(targetId, timeoutMs, `URL "${pattern}"`, async (sessionId) => {
      const result = await this.cdp.send(
        "Runtime.evaluate",
        { expression: "window.location.href", returnByValue: true },
        sessionId,
      );
      return regex.test(String(result.result?.value ?? ""));
    });
  }

  private async pollUntil(
    targetId: string,
    timeoutMs: number,
    description: string,
    check: (sessionId: string) => Promise<boolean>,
  ): Promise<CommandResult> {
    const sessionId = await this.getSession(targetId);
    const startedAt = Date.now();
    while (Date.now() - startedAt < timeoutMs) {
      if (await check(sessionId).catch(() => false)) {
        return { ok: true, result: `Found ${description}` };
      }
      await new Promise((resolve) => setTimeout(resolve, 300));
    }
    return { ok: false, error: `Timed out waiting for ${description}` };
  }

  private refFor(targetId: string, backendDOMNodeId: number) {
    let refMap = this.refMaps.get(targetId);
    if (!refMap) {
      refMap = new Map();
      this.refMaps.set(targetId, refMap);
    }

    const existing = refMap.get(backendDOMNodeId);
    if (existing) return existing;

    const next = (this.nextRefId.get(targetId) ?? 0) + 1;
    this.nextRefId.set(targetId, next);
    const ref = `@e${next}`;
    refMap.set(backendDOMNodeId, ref);
    return ref;
  }

  private setReverseRef(targetId: string, ref: string, entry: RefEntry) {
    let reverse = this.reverseRefMaps.get(targetId);
    if (!reverse) {
      reverse = new Map();
      this.reverseRefMaps.set(targetId, reverse);
    }
    reverse.set(ref, entry);
  }
}

function keyParams(key: string): Record<string, unknown> {
  if (key.includes("+")) {
    const parts = key.split("+");
    const mainKey = parts.at(-1) ?? key;
    const modifiers = parts.slice(0, -1).map((part) => part.toLowerCase());
    return {
      ...keyParams(mainKey),
      modifiers:
        (modifiers.includes("alt") ? 1 : 0) |
        (modifiers.includes("control") || modifiers.includes("ctrl") ? 2 : 0) |
        (modifiers.includes("meta") || modifiers.includes("command") ? 4 : 0) |
        (modifiers.includes("shift") ? 8 : 0),
    };
  }

  if (key.length === 1) {
    const upper = key.toUpperCase();
    return {
      key,
      code: /^[A-Z]$/.test(upper) ? `Key${upper}` : undefined,
      text: key,
      windowsVirtualKeyCode: upper.charCodeAt(0),
    };
  }

  const named: Record<string, { code: string; vk: number }> = {
    Enter: { code: "Enter", vk: 13 },
    Tab: { code: "Tab", vk: 9 },
    Escape: { code: "Escape", vk: 27 },
    Backspace: { code: "Backspace", vk: 8 },
    Delete: { code: "Delete", vk: 46 },
    ArrowUp: { code: "ArrowUp", vk: 38 },
    ArrowDown: { code: "ArrowDown", vk: 40 },
    ArrowLeft: { code: "ArrowLeft", vk: 37 },
    ArrowRight: { code: "ArrowRight", vk: 39 },
    Space: { code: "Space", vk: 32 },
  };
  const found = named[key];
  return found
    ? { key: key === "Space" ? " " : key, code: found.code, windowsVirtualKeyCode: found.vk }
    : { key };
}

function globToRegExp(pattern: string) {
  const escaped = pattern
    .replace(/[.+?^${}()|[\]\\]/g, "\\$&")
    .replace(/\*\*/g, ".*")
    .replace(/\*/g, "[^/]*");
  return new RegExp(`^${escaped}$`);
}

function failure(error: unknown): CommandResult {
  return {
    ok: false,
    error: error instanceof Error ? error.message : String(error),
  };
}
