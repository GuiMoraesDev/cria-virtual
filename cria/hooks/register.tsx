import { atom, read, update } from 'claude-code'
import type { Register } from 'claude-code'

import type { Mood } from '../types'
import { MASCOT_ANIMATIONS, type MascotKeyframe } from './frames'

const mood = atom({ plugin: 'cria', key: 'mood' } as const, 'idle' as Mood)
const step = atom({ plugin: 'cria', key: 'step' } as const, 0)
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

function endsOnQuestion(text: string): boolean {
  return /\?[\s*_`)"']*$/.test(text)
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    $.clock.every(100, () => void update($, step, s => s + 1))
    $.command.register({ name: 'cria', description: 'Show or hide the floating mascot' })

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

  on('turn.complete', async ($, e, next) => {
    if (!e.agentId) {
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

    return (
      <Box flexDirection="row" justifyContent="flex-end">
        <Box flexDirection="column" marginRight={1}>{lines}</Box>
      </Box>
    )
  })
}
