const QUOTA_LABELS: Record<string, string> = {
  five_hour: "session",
  seven_day: "weekly",
};

export function quotaLabel(kind: string): string {
  return QUOTA_LABELS[kind] ?? kind;
}

export function shortModel(id: string): string {
  const s = id.replace(/^claude-/, "").replace(/-\d{8}$/, "");
  const m = s.match(/^([a-z]+)-(\d+)-(\d+)$/);

  return m ? `${m[1]}-${m[2]}.${m[3]}` : s;
}

const compact = new Intl.NumberFormat("en-US", {
  notation: "compact",
  maximumFractionDigits: 1,
});

export function modelTag(model: string, effort: string | number | null): string {
  if (effort === null) return model;

  return `${model} · ${typeof effort === "number" ? compact.format(effort) : effort}`;
}

export function humanDuration(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;

  return `${Math.floor(m / 60)}h${String(m % 60).padStart(2, "0")}m`;
}

export function meterColor(percent: number): string {
  return percent >= 80
    ? "#F36353"
    : percent >= 65
      ? "#FF8700"
      : percent >= 50
        ? "#FFBF36"
        : "#00BD74";
}

const QUOTA_ICONS: Record<string, string> = {
  seven_day: "📅",
};

// The session window is the one that bites, so its icon tracks how full it is.
export function quotaIcon(kind: string, percent: number): string {
  if (kind === "five_hour") {
    return percent >= 80 ? "🥵" : percent >= 50 ? "😰" : "😌";
  }
  return QUOTA_ICONS[kind] ?? "🎟";
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// The short window reads as a countdown, longer ones as a weekday and time.
export function quotaReset(
  kind: string,
  resetsAt: number | null,
  now: number,
): string {
  if (resetsAt === null || resetsAt <= now) return "";
  if (kind === "five_hour") return humanDuration(resetsAt - now);
  const d = new Date(resetsAt);

  return `${WEEKDAYS[d.getDay()]} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export function meterBar(percent: number): string {
  const filled = Math.floor(
    Math.max(0, Math.min(100, Math.round(percent))) / 10,
  );

  return "█".repeat(filled) + "░".repeat(10 - filled);
}
