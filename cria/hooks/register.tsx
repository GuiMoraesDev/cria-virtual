import { atom, update } from 'claude-code'
import type { Hook, Register } from 'claude-code'

import type { Info, Mood, Subagent, Task } from '../types'
import { endsOnQuestion } from './domain/mascot'
import { quotaLabel, shortModel } from './domain/session-info'
import { renderBand } from './ui/band'

// Same plugin/key refs as the ones ui/band.tsx reads: the engine wants each file to declare the atoms it updates.
const mood = atom({ plugin: 'cria', key: 'mood' } as const, 'idle' as Mood)
const step = atom({ plugin: 'cria', key: 'step' } as const, 0)
const info = atom({ plugin: 'cria', key: 'info' } as const, null as Info | null)
const agents = atom({ plugin: 'cria', key: 'agents' } as const, [] as Subagent[])
const tasks = atom({ plugin: 'cria', key: 'tasks' } as const, [] as Task[])
const todo = atom({ plugin: 'cria', key: 'todo' } as const, null as string | null)
const isHidden = atom({ plugin: 'cria', key: 'isHidden' } as const, false)

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
    quotas: usage.rateLimits.map(({ kind, percentUsed }) => ({ label: quotaLabel(kind), percent: percentUsed })),
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
    const { agentId } = e
    if (agentId) await update($, agents, list => list.filter(agent => agent.agentId !== agentId))
    if (!agentId) {
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

  on('agent.spawn', async ($, e, next) => {
    const started = await next(e)
    const { agentId } = started
    if (agentId) {
      const agent: Subagent = { agentId, type: e.subagentType || 'agent', model: shortModel(started.model) }
      await update($, agents, list => [agent, ...list])
    }

    return started
  })

  on('tool.call', { tool: 'TodoWrite' }, async ($, e, next) => {
    const active = e.todos.find(item => item.status === 'in_progress')
    await update($, todo, () => active?.activeForm ?? null)

    return next(e)
  })

  on('tool.call', { tool: 'TaskCreate' }, async ($, e, next) => {
    const created = await next(e)
    if ('result' in created && created.result && !created.isError) {
      const task: Task = { id: created.result.task.id, label: e.activeForm ?? e.subject, status: 'pending' }
      await update($, tasks, list => [...list, task])
    }

    return created
  })

  on('tool.call', { tool: 'TaskUpdate' }, async ($, e, next) => {
    const { taskId, status, activeForm, subject } = e
    await update($, tasks, list =>
      status === 'deleted'
        ? list.filter(task => task.id !== taskId)
        : list.map(task =>
            task.id === taskId
              ? { ...task, label: activeForm ?? subject ?? task.label, status: status ?? task.status }
              : task,
          ),
    )

    return next(e)
  })

  on('ui.render', { component: 'AbovePrompt' }, renderBand)
}
