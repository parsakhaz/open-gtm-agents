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

export type BrowserStopCondition =
  | "login"
  | "captcha"
  | "credentials"
  | "permissions"
  | "ambiguity"
  | "destructive_confirmation";

export type BrowserStructuredHandoff = {
  stepsCompleted: string[];
  currentState: {
    url?: string;
    tabId?: string;
    description: string;
  };
  approachesTried: Array<{
    approach: string;
    result: "success" | "partial" | "failed";
    detail: string;
  }>;
  nextSteps: string[];
};

export type BrowserMissionRequest = {
  mission: string;
  startUrl?: string;
  exactTextToSubmit?: string;
  constraints: string[];
  successCriteria: string[];
  stopConditions: BrowserStopCondition[];
  allowedDomains?: string[];
  opportunityId?: string;
  maxTurns?: number;
};

export type BrowserMissionResult = {
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
  structuredHandoff?: BrowserStructuredHandoff;
};

export type BrowserResult = BrowserMissionResult;

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
    }
  | {
      type: "orchestrator_decision";
      message: string;
      createdAt: string;
    }
  | {
      type: "browser_agent_step";
      message: string;
      createdAt: string;
    }
  | {
      type: "browser_agent_retry";
      message: string;
      retryDelayMs?: number;
      createdAt: string;
    }
  | {
      type: "browser_handoff";
      handoff: BrowserStructuredHandoff;
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
