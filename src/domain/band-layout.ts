import type { Info } from "../../types";
import { meterBar, modelTag, quotaIcon } from "./session-info";

export type BandStage =
  | "row"
  | "quotas-below"
  | "info-column"
  | "mascot-above"
  | "no-mascot";

const GAP = 2;
const MASCOT = 13;
const MARGIN = 1;
const TIMER = 6;
const CONTEXT_EMOJI = "😁";
const SESSION_RESET = 6;
const LONGER_RESET = 9;
const RESET_PREFIX = " ⏳ ";

// Emoji take two cells, everything else one.
function cells(text: string) {
  let width = 0;
  for (const char of text)
    width += /\p{Extended_Pictographic}/u.test(char) ? 2 : 1;
  return width;
}

const widest = (lines: string[]) => Math.max(0, ...lines.map(cells));

function modelGroup(info: Info) {
  return widest([
    `🧠 [${modelTag(info.model, info.effort)}]`,
    `📁 ${info.dir}`,
  ]);
}

// The timer and a reset are reserved at their longest, as the layout has no clock.
function branchGroup(info: Info) {
  const lines: string[] = [];
  const branch = info.branch ? `🌿 ${info.branch}${info.dirty ? "*" : ""}` : "";
  lines.push(`${branch}${branch ? " ".repeat(GAP) : ""}⏱ ${"0".repeat(TIMER)}`);
  if (info.contextPercent !== null) {
    lines.push(
      `${CONTEXT_EMOJI} ${meterBar(info.contextPercent)} ${Math.round(info.contextPercent)}%`,
    );
  }
  return widest(lines) + MARGIN;
}

function quotasGroup(info: Info) {
  if (info.quotas.length === 0) return 0;
  const lines = info.quotas.map(({ kind, label, percent, resetsAt }) => {
    const reset =
      resetsAt === null
        ? ""
        : RESET_PREFIX +
          "0".repeat(kind === "five_hour" ? SESSION_RESET : LONGER_RESET);
    return `${quotaIcon(kind, percent)} ${label} ${Math.round(percent)}%${reset}`;
  });
  return widest(lines) + MARGIN;
}

export function bandLayout(columns: number, info: Info | null): BandStage {
  if (columns < MASCOT) return "no-mascot";
  if (!info) return "row";
  const first = modelGroup(info) + GAP + branchGroup(info);
  const quotas = quotasGroup(info);
  if (first + (quotas ? GAP + quotas : 0) + MASCOT <= columns) return "row";
  if (first + MASCOT <= columns) return "quotas-below";
  const column = Math.max(modelGroup(info), branchGroup(info), quotasGroup(info));
  if (column + MASCOT <= columns) return "info-column";
  return "mascot-above";
}
