import { expect, mock, test } from 'claude-code/testing'
import type { Engine } from 'claude-code/testing'
import type { On, TurnStepInput } from 'claude-code'

import type { Info } from '../types'

const MAIN_STEP: TurnStepInput = { turnId: 't1', index: 0, model: 'claude-opus-5-5', effort: 'high', messageCount: 1 }

// The world beneath the plugin: a session on opus-5.5 outside git, and the last info the plugin wrote.
function world(on: On) {
  const clock = mock.clock(on)
  const written: { info: Info | null; steps: TurnStepInput[] } = { info: null, steps: [] }
  on('session.model', async () => ({ value: 'claude-opus-5-5' }))
  on('session.cwd', async () => ({ value: '/work/cria-virtual' }))
  on('session.usage', async () => ({ value: { startedAt: 0, context: { window: 200_000 }, rateLimits: [] } }))
  on('process.run', async () => ({
    value: { exitCode: 128, stdout: '', stderr: '', isStdoutTruncated: false, isStderrTruncated: false },
  }))
  on('turn.complete', async ($, e) => ({ text: e.answer }))
  on('session.measure', async ($, e) => ({ changed: e.changed }))
  on('state.set', async ($, e, next) => {
    if (e.plugin === 'cria' && e.key === 'info') written.info = e.value as Info | null
    return next(e)
  })
  on('turn.step', async function* ($, e) {
    written.steps.push({ ...e })
    return { turnId: e.turnId, index: e.index, answer: '', toolUses: [], stopReason: 'end_turn', usage: null }
  })
  return { clock, written }
}

async function step($: Engine, e: TurnStepInput) {
  const stream = $.turn.step(e)
  for await (const chunk of stream) void chunk
  return stream.result
}

async function completeMainTurn($: Engine) {
  await $.turn.complete({ answer: 'ok', durationMs: 1, isAborted: false, turnId: 't1', reason: 'answer' })
}

test('turn.step records the main loop effort on info and ignores a subagent step', async ($, on) => {
  const { clock, written } = world(on)
  await completeMainTurn($)
  await clock.settle()
  expect(written.info?.model).toBe('opus-5.5')

  await step($, MAIN_STEP)
  await clock.settle()
  expect(written.info?.effort).toBe('high')

  await step($, { ...MAIN_STEP, effort: 'low', agentId: 'agent-1' })
  await clock.settle()
  expect(written.info?.effort).toBe('high')
})

test('refreshInfo keeps the recorded effort and turn.step passes its input on unchanged', async ($, on) => {
  const { clock, written } = world(on)
  await completeMainTurn($)
  await clock.settle()
  await step($, MAIN_STEP)
  await clock.settle()

  await completeMainTurn($)
  await clock.settle()
  expect(written.info?.effort).toBe('high')

  await $.session.measure({ context: { window: 200_000, percent: 10 }, rateLimits: [], changed: ['context'] })
  await clock.settle()
  expect(written.info?.effort).toBe('high')

  expect(written.steps[0]).toEqual(MAIN_STEP)
})

test('/cria hides the band, then brings it back', async ($, on) => {
  world(on)
  const hidden = await $.command.run({ command: 'cria', args: '' })
  expect(hidden.text).toBe('Cria hidden')

  const back = await $.command.run({ command: 'cria', args: '' })
  expect(back.text).toBe('Cria is back')
})
