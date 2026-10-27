import { atom, read, update } from 'claude-code'
import type { Caught, EngineInterface, Register } from 'claude-code'

import type { Info, Mood, SessionWait } from '../types'
import { quotaLabel, shortModel } from './domain/session-info'
import { checkVerdict, promptSubmit, toolEnd, turnEnd } from './domain/session'
import type { SessionState } from './domain/session'
import { renderBand } from './ui/band'

const DONE_RESET_MS = 4000

// Same plugin/key refs as the ones ui/band.tsx reads: the engine wants each file to declare the atoms it updates.
const mood = atom({ plugin: 'cria', key: 'mood' } as const, 'idle' as Mood)
const step = atom({ plugin: 'cria', key: 'step' } as const, 0)
const info = atom({ plugin: 'cria', key: 'info' } as const, null as Info | null)
const isHidden = atom({ plugin: 'cria', key: 'isHidden' } as const, false)
const waiting = atom({ plugin: 'cria', key: 'waiting' } as const, {
  dialog: false,
  permission: false,
  lastTurnAsked: false,
} as SessionWait)

function passThrough<D, E, R>($: D, e: E, next: ((e: E) => R) & Caught) {
  return next.called ? undefined : next(e)
}

async function currentBranch($: EngineInterface, cwd: string) {
  const git = await $.process.run(['git', '-C', cwd, 'rev-parse', '--abbrev-ref', 'HEAD']).catch(() => null)
  return git && git.exitCode === 0 ? String(git.stdout).trim() : null
}

async function isDirty($: EngineInterface, cwd: string) {
  const diff = await $.process.run(['git', '-C', cwd, 'diff', '--quiet', '--ignore-submodules', 'HEAD']).catch(() => null)
  return diff !== null && diff.exitCode === 1
}

async function refreshInfo($: EngineInterface) {
  const [model, cwd, usage] = await Promise.all([$.session.model(), $.session.cwd(), $.session.usage()])
  const branch = await currentBranch($, cwd)
  const dirty = branch ? await isDirty($, cwd) : false
  const next: Info = {
    model: shortModel(model),
    dir: cwd.split('/').pop() ?? cwd,
    branch,
    dirty,
    contextPercent: usage.context.percent ?? null,
    startedAt: usage.startedAt,
    quotas: usage.rateLimits.map(({ kind, percentUsed, resetsAt }) => ({
      kind,
      label: quotaLabel(kind),
      percent: percentUsed,
      resetsAt: resetsAt ? Date.parse(resetsAt) : null,
    })),
  }
  await update($, info, () => next)
}

async function setMood($: EngineInterface, value: Mood) {
  await update($, mood, () => value)
}

async function applySession($: EngineInterface, reduce: (state: SessionState) => SessionState) {
  const next = reduce({ mood: await read($, mood), waiting: await read($, waiting) })
  await update($, mood, () => next.mood)
  await update($, waiting, () => next.waiting)
  return next
}

async function setWaiting($: EngineInterface, change: Partial<SessionWait>) {
  await update($, waiting, wait => ({ ...wait, ...change }))
}

export const register: Register = on => {
  // Bumped on every prompt and main turn end so a stale "done → idle" timer knows to skip.
  let generation = 0
  // Set once AskUserQuestion runs: mood stays 'asking' until the next prompt or main turn end.
  let isAskHeld = false

  const resetTurn = () => {
    generation += 1
    isAskHeld = false
  }

  // Lifecycle & command
  on('session.start', async ($, e, next) => {
    $.clock.every(100, () => void update($, step, s => s + 1))
    await $.command.register({
      name: 'cria',
      description: 'Show or hide the mascot band',
    })
    void refreshInfo($)

    return next(e)
  }).catch(passThrough)

  on('command.run', { command: 'cria' }, async ($, e) => {
    const arg = e.args.trim()
    if (arg) return { text: `Unknown argument "${arg}". Use /cria.` }

    const hidden = await update($, isHidden, h => !h)

    return { text: hidden ? 'Cria hidden' : 'Cria is back' }
  }).catch(passThrough)

  on('session.compact', async ($, e, next) => {
    await setMood($, 'loading')
    try {
      return await next(e)
    } finally {
      await setMood($, 'idle')
    }
  }).catch(passThrough)

  on('session.measure', async ($, e, next) => {
    void refreshInfo($)

    return next(e)
  }).catch(passThrough)

  // Turn & tool mood. A plugin's registrations on one event nest in order, first outermost,
  // so the tool.call hooks below keep their relative order.
  on('prompt.submit', async ($, e, next) => {
    resetTurn()
    await applySession($, promptSubmit)

    return next(e)
  }).catch(passThrough)

  on('tool.check', async ($, e, next) => {
    const verdict = await next(e)
    await applySession($, state => checkVerdict(state, { decision: verdict.decision, agentId: e.agentId }))

    return verdict
  }).catch(passThrough)

  // The permission prompt is answered inside tool.call's next(e), so its end clears the flag.
  on('tool.call', async ($, e, next) => {
    try {
      return await next(e)
    } finally {
      if (!e.agentId) {
        await applySession($, state => {
          const ended = toolEnd(state)
          return isAskHeld ? { ...ended, mood: 'asking' } : ended
        })
      }
    }
  }).catch(passThrough)

  on('tool.call', { tool: 'AskUserQuestion' }, async ($, e, next) => {
    isAskHeld = true
    await setWaiting($, { dialog: true })
    await setMood($, 'asking')
    try {
      return await next(e)
    } finally {
      await setWaiting($, { dialog: false })
    }
  }).catch(passThrough)

  on('turn.complete', async ($, e, next) => {
    if (!e.agentId) {
      void refreshInfo($)
      resetTurn()
      const finished = generation
      const ended = await applySession($, state => turnEnd(state, { isAborted: e.isAborted, answer: e.answer }))
      if (ended.mood === 'done') {
        $.clock.after(DONE_RESET_MS, () => {
          if (generation === finished) void setMood($, 'idle')
        })
      }
    }

    return next(e)
  }).catch(passThrough)

  // Render
  on('ui.render', { component: 'AbovePrompt' }, renderBand)
}
