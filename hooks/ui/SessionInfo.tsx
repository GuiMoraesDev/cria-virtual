import type { ElementTable } from 'claude-code'

import type { Info, Subagent } from '../../types'
import { humanDuration, meterColor } from '../domain/session-info'

type SessionInfoProps = {
  ui: ElementTable
  details: Info | null
  now: number
  running: Subagent[]
  current: string | null
}

export function SessionInfo({ ui: { Box, Text }, details, now, running, current }: SessionInfoProps) {
  const activity = [
    running.length > 0 ? (
      <Text key="agents">
        <Text color="#C678DD">⚡{running.length > 1 ? running.length : ''}</Text>{' '}
        {running.slice(0, 2).map(({ type, model }) => `${type}·${model}`).join(', ')}
        {running.length > 2 && <Text dimColor> +{running.length - 2}</Text>}
      </Text>
    ) : null,
    current ? <Text key="task" weight="bold">{current}</Text> : null,
  ]
  const rows = details
    ? [
        <Text key="model">
          <Text color="#00B4D8">[{details.model}]</Text> <Text dimColor>📁 {details.dir}</Text>
        </Text>,
        details.branch ? <Text key="branch" color="#00BD74">🌿 {details.branch}</Text> : null,
        <Text key="time">
          <Text color="#00B4D8">⏱ {humanDuration(now - details.startedAt)}</Text>
          {details.contextPercent !== null && (
            <Text color={meterColor(details.contextPercent)}> 🧠 {Math.round(details.contextPercent)}%</Text>
          )}
        </Text>,
        details.quotas.length > 0 ? (
          <Text key="quota">
            {details.quotas.map(({ label, percent }, index) => (
              <Text key={label} color={meterColor(percent)}>
                {index > 0 ? ' · ' : ''}
                {label} {Math.round(percent)}%
              </Text>
            ))}
          </Text>
        ) : null,
        ...activity,
      ]
    : activity

  return (
    <Box flexDirection="column" alignItems="flex-end" marginRight={1}>
      {rows}
    </Box>
  )
}
