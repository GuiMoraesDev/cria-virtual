import type { ElementTable } from "claude-code";

import type { Info } from "../../types";
import type { BandStage } from "../domain/band-layout";
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
  stage: BandStage;
};

export function SessionInfo({
  ui: { Box, Text },
  details,
  now,
  stage,
}: SessionInfoProps) {
  if (!details) return null;

  const model = (
    <Box key="model" flexDirection="column">
      <Text color="#00B4D8">
        🧠 [{modelTag(details.model, details.effort)}]
      </Text>
      <Text dimColor wrap="truncate-start">
        📁 {details.dir}
      </Text>
    </Box>
  );

  const branch = (
    <Box
      key="branch"
      flexDirection="column"
      alignItems="stretch"
      marginRight={1}
    >
      <Box alignItems="flex-end" gap={2}>
        {details.branch ? (
          <Box key="branch">
            <Text color="#00BD74" wrap="truncate-end">
              🌿 {details.branch}
            </Text>
            {details.dirty ? (
              <Box flexShrink={0}>
                <Text color="#00BD74">*</Text>
              </Box>
            ) : null}
          </Box>
        ) : null}
        <Text color="#00B4D8">⏱ {humanDuration(now - details.startedAt)}</Text>
      </Box>

      {details.contextPercent !== null && (
        <Text color={meterColor(details.contextPercent)}>
          {details.contextPercent >= 80 ? "🥵" : "😁"}{" "}
          {meterBar(details.contextPercent)}{" "}
          {Math.round(details.contextPercent)}%
        </Text>
      )}
    </Box>
  );

  const quotas =
    details.quotas.length > 0 ? (
      <Box
        key="quotas"
        flexDirection="column"
        alignItems="stretch"
        marginRight={1}
      >
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
    ) : null;

  if (
    stage === "info-column" ||
    stage === "mascot-above" ||
    stage === "no-mascot"
  ) {
    return (
      <Box flexDirection="column">
        {model}
        {branch}
        {quotas}
      </Box>
    );
  }

  if (stage === "quotas-below") {
    return (
      <Box flexDirection="column">
        <Box alignItems="flex-end" gap={2}>
          {model}
          {branch}
        </Box>
        {quotas}
      </Box>
    );
  }

  return (
    <Box alignItems="flex-end" gap={2}>
      {model}
      {branch}
      {quotas}
    </Box>
  );
}
