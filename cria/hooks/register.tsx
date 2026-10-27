import { atom, read, update } from 'claude-code'
import type { Hook, Register } from 'claude-code'

import type { Info, Mood } from '../types'
import { MASCOT_ANIMATIONS, type MascotKeyframe } from './frames'

const mood = atom({ plugin: 'cria', key: 'mood' } as const, 'idle' as Mood)
const step = atom({ plugin: 'cria', key: 'step' } as const, 0)
const info = atom({ plugin: 'cria', key: 'info' } as const, null as Info | null)
const isHidden = atom({ plugin: 'cria', key: 'isHidden' } as const, false)

const PALETTE: Record<string, string> = {
  A: '#00B4D8', B: '#00B7BC', D: '#1B3137', E: '#D5DFE0', G: '#00BD74', K: '#11191C', M: '#8E2A20',
  N: '#91513C', R: '#F36353', S: '#1F6D75', T: '#C6966D', W: '#FFFFFF', Y: '#FFBF36',
}

function keyframeAt(keyframes: MascotKeyframe[], at: number): string[] {
  const loop = keyframes.reduce((total, { steps }) => total + steps, 0)
  let elapsed = at % loop
  for (const { steps, rows } of keyframes) {
    if (elapsed < steps) return rows
    elapsed -= steps
  }

  return keyframes[0]?.rows ?? []
}

const QUOTA_LABELS: Record<string, string> = { five_hour: 'session', seven_day: 'weekly' }

function shortModel(id: string): string {
  const s = id.replace(/^claude-/, '').replace(/-\d{8}$/, '')
  const m = s.match(/^([a-z]+)-(\d+)-(\d+)$/)

  return m ? `${m[1]}-${m[2]}.${m[3]}` : s
}

function humanDuration(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000))
  if (s < 60) return `${s}s`
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m`

  return `${Math.floor(m / 60)}h${String(m % 60).padStart(2, '0')}m`
}

function meterColor(percent: number): string {
  return percent >= 80 ? '#F36353' : percent >= 65 ? '#FF8700' : percent >= 50 ? '#FFBF36' : '#00BD74'
}

function endsOnQuestion(text: string): boolean {
  return /\?[\s*_`)"']*$/.test(text)
}

async function refreshInfo($: Parameters<Hook<'session.measure'>>[0]) {
  const [model, cwd, usage] = await Promise.all([$.session.model(), $.session.cwd(), $.session.usage()])
  const git = await $.process.run(['git', '-C', cwd, 'rev-parse', '--abbrev-ref', 'HEAD']).catch(() => null)
  const branch = git && git.exitCode === 0 ? String(git.stdout).trim() : null
  const next: Info = {
    model: shortModel(model),
    dir: cwd.split('/').pop() ?? cwd,
    branch,
    contextPercent: usage.context.percent ?? null,
    startedAt: usage.startedAt,
    quotas: usage.rateLimits.map(({ kind, percentUsed }) => ({ label: QUOTA_LABELS[kind] ?? kind, percent: percentUsed })),
  }
  await update($, info, () => next)
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    $.clock.every(100, () => void update($, step, s => s + 1))
    $.command.register({ name: 'cria', description: 'Show or hide the floating mascot' })
    void refreshInfo($)

    return next(e)
  })

  on('command.run', { command: 'cria' }, async $ => {
    const hidden = await update($, isHidden, h => !h)

    return { text: hidden ? 'Cria hidden' : 'Cria is back' }
  })

  // Bumped on every state change so a stale "done → idle" timer knows to skip.
  let generation = 0

  on('prompt.submit', async ($, e, next) => {
    generation += 1
    await update($, mood, (): Mood => 'working')

    return next(e)
  })

  on('tool.check', async ($, e, next) => {
    const verdict = await next(e)
    if (verdict.decision === 'ask' && !e.agentId) await update($, mood, (): Mood => 'asking')

    return verdict
  })

  on('tool.call', async ($, e, next) => {
    if (e.tool === 'AskUserQuestion') await update($, mood, (): Mood => 'asking')
    try {
      return await next(e)
    } finally {
      await update($, mood, (): Mood => 'working')
    }
  })

  on('session.compact', async ($, e, next) => {
    await update($, mood, (): Mood => 'loading')
    try {
      return await next(e)
    } finally {
      await update($, mood, (): Mood => 'idle')
    }
  })

  on('session.measure', async ($, e, next) => {
    void refreshInfo($)

    return next(e)
  })

  on('turn.complete', async ($, e, next) => {
    if (!e.agentId) {
      void refreshInfo($)
      generation += 1
      const finished = generation
      const nextMood: Mood = e.isAborted ? 'blocked' : endsOnQuestion(e.answer) ? 'asking' : 'done'
      await update($, mood, () => nextMood)
      if (nextMood === 'done') {
        $.clock.after(4000, () => {
          if (generation === finished) void update($, mood, (): Mood => 'idle')
        })
      }
    }

    return next(e)
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    if (await read($, isHidden)) return next(e)

    const { Box, Text } = $.ui.resolve(e)
    const pixels = keyframeAt(MASCOT_ANIMATIONS[await read($, mood)], await read($, step))
    const lines = []
    for (let y = 0; y < pixels.length; y += 2) {
      const upper = pixels[y] ?? ''
      const lower = pixels[y + 1] ?? ''
      lines.push(
        <Text key={`row-${y}`}>
          {[...upper].map((ch, x) => {
            const top = PALETTE[ch]
            const bottom = PALETTE[lower[x] ?? '.']
            if (top) return <Text key={`px-${x}`} color={top} backgroundColor={bottom}>▀</Text>
            if (bottom) return <Text key={`px-${x}`} color={bottom}>▄</Text>

            return ' '
          })}
        </Text>,
      )
    }

    const details = await read($, info)
    const now = await $.clock.now()
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
        ]
      : []

    return (
      <Box flexDirection="row" justifyContent="flex-end" alignItems="center">
        <Box flexDirection="column" alignItems="flex-end" marginRight={1}>{rows}</Box>
        <Box flexDirection="column" marginRight={1}>{lines}</Box>
      </Box>
    )
  })
}
