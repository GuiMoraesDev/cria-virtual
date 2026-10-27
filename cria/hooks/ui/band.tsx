import { atom, read } from 'claude-code'
import type { EngineInterface, Next, RenderInput } from 'claude-code'

import type { Info, Mood, Subagent, Task } from '../../types'
import { mascotFrame } from '../domain/mascot'
import { humanDuration, meterColor } from '../domain/session-info'
import { MascotSprite } from './components/atoms/MascotSprite'

const mood = atom({ plugin: 'cria', key: 'mood' } as const, 'idle' as Mood)
const step = atom({ plugin: 'cria', key: 'step' } as const, 0)
const info = atom({ plugin: 'cria', key: 'info' } as const, null as Info | null)
const agents = atom({ plugin: 'cria', key: 'agents' } as const, [] as Subagent[])
const tasks = atom({ plugin: 'cria', key: 'tasks' } as const, [] as Task[])
const todo = atom({ plugin: 'cria', key: 'todo' } as const, null as string | null)
const isHidden = atom({ plugin: 'cria', key: 'isHidden' } as const, false)

export async function renderBand(
  $: EngineInterface,
  e: RenderInput<'AbovePrompt'>,
  next: Next<'ui.render', RenderInput<'AbovePrompt'>>,
) {
  if (await read($, isHidden)) return next(e)

  const ui = $.ui.resolve(e)
  const { Box, Text } = ui
  const cells = mascotFrame(await read($, mood), await read($, step))

  const details = await read($, info)
  const now = await $.clock.now()
  const running = await read($, agents)
  const current = (await read($, tasks)).find(task => task.status === 'in_progress')?.label ?? (await read($, todo))
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
    <Box flexDirection="row" justifyContent="flex-end" alignItems="center">
      <Box flexDirection="column" alignItems="flex-end" marginRight={1}>{rows}</Box>
      <Box marginRight={1}>
        <MascotSprite ui={ui} cells={cells} />
      </Box>
    </Box>
  )
}
