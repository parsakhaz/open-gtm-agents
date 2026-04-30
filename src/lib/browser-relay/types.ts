export type BrowserCommand =
  | { name: "list_tabs" }
  | { name: "new_tab"; url?: string }
  | { name: "snap"; tabId: string; mode?: "interactive" | "full" }
  | { name: "screenshot"; tabId: string }
  | { name: "navigate"; tabId: string; url: string }
  | { name: "click_element"; tabId: string; index: `@e${number}` }
  | { name: "clickxy"; tabId: string; x: number; y: number }
  | { name: "type_text"; tabId: string; text: string }
  | { name: "press_key"; tabId: string; key: string }
  | { name: "scroll"; tabId: string; direction?: "up" | "down"; amount?: number }
  | { name: "wait_for_text"; tabId: string; text: string; timeoutMs?: number }
  | { name: "wait_for_url"; tabId: string; pattern: string; timeoutMs?: number };

export type CommandResult = {
  ok: boolean;
  result?: string;
  error?: string;
};

export type BrowserConnectionStatus = {
  enabled: boolean;
  connected: boolean;
  browserInfo?: {
    browser: string;
    version: string;
  };
};

export type PostCommentRequest = {
  url: string;
  comment: string;
  opportunityId?: string;
};

export type BrowserResult = {
  summary: string;
  actionsTaken: string[];
  finalUrl?: string;
  activeTabId?: string;
  success: boolean;
  error?: string;
  needsUserInput?: {
    question: string;
    blockedOn: "missing_information" | "destructive_confirmation" | "clarification" | "credentials";
  };
};

export type BrowserRunEvent =
  | {
      type: "browser_status";
      connected: boolean;
      message: string;
      createdAt: string;
    }
  | {
      type: "browser_tool_call";
      command: BrowserCommand["name"] | "produce_browser_result";
      createdAt: string;
    }
  | {
      type: "browser_tool_result";
      command: BrowserCommand["name"] | "produce_browser_result";
      ok: boolean;
      preview?: string;
      createdAt: string;
    }
  | {
      type: "browser_done";
      result: BrowserResult;
      createdAt: string;
    }
  | {
      type: "browser_error";
      message: string;
      createdAt: string;
    };

export type BrowserRelayRequest =
  | {
      type: "status";
    }
  | {
      type: "command";
      command: BrowserCommand;
    };
