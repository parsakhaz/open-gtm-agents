type LogLevel = "debug" | "info" | "warn" | "error";

const SECRET_PATTERNS = [
  /api[_-]?key/i,
  /authorization/i,
  /bearer/i,
  /token/i,
  /secret/i,
  /password/i,
  /service[_-]?role/i,
];

export function debugLog(scope: string, message: string, data?: unknown, level: LogLevel = "info") {
  const at = new Date().toISOString();
  const suffix = data === undefined ? "" : ` ${safeJson(data)}`;
  const line = `[${at}] [${scope}] ${message}${suffix}`;

  if (level === "error") {
    console.error(line);
  } else if (level === "warn") {
    console.warn(line);
  } else {
    console.log(line);
  }
}

export function previewForLog(value: unknown, maxLength = 500) {
  if (value == null) return value;
  const text = typeof value === "string" ? value : safeJson(value);
  return text.length > maxLength ? `${text.slice(0, maxLength)}...[truncated ${text.length - maxLength} chars]` : text;
}

export function durationMs(startedAt: number) {
  return Date.now() - startedAt;
}

function safeJson(value: unknown) {
  try {
    return JSON.stringify(redact(value));
  } catch {
    return String(value);
  }
}

function redact(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(redact);

  if (value && typeof value === "object") {
    const redacted: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value)) {
      redacted[key] = SECRET_PATTERNS.some((pattern) => pattern.test(key))
        ? "[redacted]"
        : redact(item);
    }
    return redacted;
  }

  if (typeof value === "string") {
    return value
      .replace(/Bearer\s+[A-Za-z0-9._-]+/gi, "Bearer [redacted]")
      .replace(/sk-[A-Za-z0-9_-]+/g, "sk-[redacted]");
  }

  return value;
}
