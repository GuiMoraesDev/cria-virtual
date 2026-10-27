import type { ElementTable } from "claude-code";

import type { Info, Subagent } from "../../types";
import {
  humanDuration,
  meterBar,
  meterColor,
  quotaIcon,
  quotaReset,
} from "../domain/session-info";

type SessionInfoProps = {
  ui: ElementTable;
  details: Info | null;
  now: number;
  running: Subagent[];
  current: string | null;
};

export function SessionInfo({
  ui: { Box, Text },
  details,
  now,
  running,
  current,
}: SessionInfoProps) {
  const activity = [
    running.length > 0 ? (
      <Text key="agents">
        <Text color="#C678DD">
          ⚡{running.length > 1 ? running.length : ""}
        </Text>{" "}
        {running
          .slice(0, 2)
          .map(({ type, model }) => `${type}·${model}`)
          .join(", ")}
        {running.length > 2 && <Text dimColor> +{running.length - 2}</Text>}
      </Text>
    ) : null,
    current ? (
      <Text key="task" weight="bold">
        {current}
      </Text>
    ) : null,
  ];

  if (!details) {
    return (
      <Box flexDirection="column" alignItems="flex-end" marginRight={1}>
        {activity}
      </Box>
    );
  }

  return (
    <Box alignItems="flex-end" gap={2}>
      <Box flexDirection="column">
        <Text color="#00B4D8">🧠 [{details.model}]</Text>
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
                  {quotaIcon(kind)} {label} {Math.round(percent)}%
                </Text>
                {reset && <Text dimColor> ⏳ {reset}</Text>}
              </Text>
            );
          })}
        </Box>
      ) : null}

      {activity}
    </Box>
  );
}
