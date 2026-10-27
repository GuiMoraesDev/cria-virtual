import type { ElementTable } from "claude-code";

import type { Info } from "../../types";
import {
  humanDuration,
  meterBar,
  meterColor,
  modelTag,
  quotaIcon,
  quotaReset,
} from "../domain/session-info";

type SessionInfoProps = {
  ui: ElementTable;
  details: Info | null;
  now: number;
};

export function SessionInfo({
  ui: { Box, Text },
  details,
  now,
}: SessionInfoProps) {
  if (!details) return null;

  return (
    <Box alignItems="flex-end" gap={2}>
      <Box flexDirection="column">
        <Text color="#00B4D8">🧠 [{modelTag(details.model, details.effort)}]</Text>
        <Text dimColor>📁 {details.dir}</Text>
      </Box>

      <Box flexDirection="column" alignItems="stretch" marginRight={1}>
        <Box alignItems="flex-end" gap={2}>
          {details.branch ? (
            <Text key="branch" color="#00BD74">
              🌿 {details.branch}
              {details.dirty ? "*" : ""}
            </Text>
          ) : null}
          <Text color="#00B4D8">
            ⏱ {humanDuration(now - details.startedAt)}
          </Text>
        </Box>

        {details.contextPercent !== null && (
          <Text color={meterColor(details.contextPercent)}>
            {details.contextPercent >= 80 ? "🥵" : "😁"}{" "}
            {meterBar(details.contextPercent)}{" "}
            {Math.round(details.contextPercent)}%
          </Text>
        )}
      </Box>

      {details.quotas.length > 0 ? (
        <Box flexDirection="column" alignItems="stretch" marginRight={1}>
          {details.quotas.map(({ kind, label, percent, resetsAt }) => {
            const reset = quotaReset(kind, resetsAt, now);

            return (
              <Text key={kind}>
                <Text color={meterColor(percent)}>
                  {quotaIcon(kind, percent)} {label} {Math.round(percent)}%
                </Text>
                {reset && <Text dimColor> ⏳ {reset}</Text>}
              </Text>
            );
          })}
        </Box>
      ) : null}
    </Box>
  );
}
