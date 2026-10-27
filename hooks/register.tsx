import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { Info, Mood, SessionWait, Subagent, Task } from '../types'
import { quotaLabel, shortModel } from './domain/session-info'
import { checkVerdict, promptSubmit, toolEnd, turnEnd } from './domain/session'
import type { SessionState } from './domain/session'
import { addTask, updateTask } from './domain/tasks'
import { renderBand } from './ui/band'

const DONE_RESET_MS = 4000

// Same plugin/key refs as the ones ui/band.tsx reads: the engine wants each file to declare the atoms it updates.
const mood = atom({ plugin: 'cria', key: 'mood' } as const, 'idle' as Mood)
const step = atom({ plugin: 'cria', key: 'step' } as const, 0)
const info = atom({ plugin: 'cria', key: 'info' } as const, null as Info | null)
const agents = atom({ plugin: 'cria', key: 'agents' } as const, [] as Subagent[])
const tasks = atom({ plugin: 'cria', key: 'tasks' } as const, [] as Task[])
const todo = atom({ plugin: 'cria', key: 'todo' } as const, null as string | null)
const isHidden = atom({ plugin: 'cria', key: 'isHidden' } as const, false)
const waiting = atom({ plugin: 'cria', key: 'waiting' } as const, {
  dialog: false,
  permission: false,
  lastTurnAsked: false,
} as SessionWait)

async function refreshInfo($: EngineInterface) {
  const [model, cwd, usage] = await Promise.all([$.session.model(), $.session.cwd(), $.session.usage()])
  const git = await $.process.run(['git', '-C', cwd, 'rev-parse', '--abbrev-ref', 'HEAD']).catch(() => null)
  const branch = git && git.exitCode === 0 ? String(git.stdout).trim() : null
  const next: Info = {
    model: shortModel(model),
    dir: cwd.split('/').pop() ?? cwd,
    branch,
    contextPercent: usage.context.percent ?? null,
    startedAt: usage.startedAt,
    quotas: usage.rateLimits.map(({ kind, percentUsed }) => ({ label: quotaLabel(kind), percent: percentUsed })),
  }
  await update($, info, () => next)
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

  on('session.start', async ($, e, next) => {
    $.clock.every(100, () => void update($, step, s => s + 1))
    await $.command.register({
      name: 'cria',
      description: 'Show or hide the mascot band',
    })
    void refreshInfo($)

    return next(e)
  }).catch(($, e, next) => (next.called ? undefined : next(e)))

  on('command.run', { command: 'cria' }, async ($, e) => {
    const arg = e.args.trim()
    if (arg) return { text: `Unknown argument "${arg}". Use /cria.` }

    const hidden = await update($, isHidden, h => !h)

    return { text: hidden ? 'Cria hidden' : 'Cria is back' }
  }).catch(($, e, next) => (next.called ? undefined : next(e)))

  on('prompt.submit', async ($, e, next) => {
    generation += 1
    isAskHeld = false
    await applySession($, promptSubmit)

    return next(e)
  }).catch(($, e, next) => (next.called ? undefined : next(e)))

  on('tool.check', async ($, e, next) => {
    const verdict = await next(e)
    await applySession($, state => checkVerdict(state, { decision: verdict.decision, agentId: e.agentId }))

    return verdict
  }).catch(($, e, next) => (next.called ? undefined : next(e)))

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
  }).catch(($, e, next) => (next.called ? undefined : next(e)))

  on('tool.call', { tool: 'AskUserQuestion' }, async ($, e, next) => {
    isAskHeld = true
    await setWaiting($, { dialog: true })
    await update($, mood, (): Mood => 'asking')
    try {
      return await next(e)
    } finally {
      await setWaiting($, { dialog: false })
    }
  }).catch(($, e, next) => (next.called ? undefined : next(e)))

  on('session.compact', async ($, e, next) => {
    await update($, mood, (): Mood => 'loading')
    try {
      return await next(e)
    } finally {
      await update($, mood, (): Mood => 'idle')
    }
  }).catch(($, e, next) => (next.called ? undefined : next(e)))

  on('session.measure', async ($, e, next) => {
    void refreshInfo($)

    return next(e)
  }).catch(($, e, next) => (next.called ? undefined : next(e)))

  on('turn.complete', async ($, e, next) => {
    const { agentId } = e
    if (agentId) await update($, agents, list => list.filter(agent => agent.agentId !== agentId))
    if (!agentId) {
      void refreshInfo($)
      generation += 1
      isAskHeld = false
      const finished = generation
      const ended = await applySession($, state => turnEnd(state, { isAborted: e.isAborted, answer: e.answer }))
      if (ended.mood === 'done') {
        $.clock.after(DONE_RESET_MS, () => {
          if (generation === finished) void update($, mood, (): Mood => 'idle')
        })
      }
    }

    return next(e)
  }).catch(($, e, next) => (next.called ? undefined : next(e)))

  on('agent.spawn', async ($, e, next) => {
    const started = await next(e)
    const { agentId } = started
    if (agentId) {
      const agent: Subagent = { agentId, type: e.subagentType || 'agent', model: shortModel(started.model) }
      await update($, agents, list => [agent, ...list])
    }

    return started
  }).catch(($, e, next) => (next.called ? undefined : next(e)))

  on('tool.call', { tool: 'TodoWrite' }, async ($, e, next) => {
    const active = e.todos.find(item => item.status === 'in_progress')
    await update($, todo, () => active?.activeForm ?? null)

    return next(e)
  }).catch(($, e, next) => (next.called ? undefined : next(e)))

  on('tool.call', { tool: 'TaskCreate' }, async ($, e, next) => {
    const created = await next(e)
    if ('result' in created && created.result && !created.isError) {
      const task: Task = { id: created.result.task.id, label: e.activeForm ?? e.subject, status: 'pending' }
      await update($, tasks, list => addTask(list, task))
    }

    return created
  }).catch(($, e, next) => (next.called ? undefined : next(e)))

  on('tool.call', { tool: 'TaskUpdate' }, async ($, e, next) => {
    const { taskId, status, activeForm, subject } = e
    await update($, tasks, list => updateTask(list, { taskId, status, activeForm, subject }))

    return next(e)
  }).catch(($, e, next) => (next.called ? undefined : next(e)))

  on('ui.render', { component: 'AbovePrompt' }, renderBand)
}
