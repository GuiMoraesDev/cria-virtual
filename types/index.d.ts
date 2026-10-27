export type Info = {
  model: string
  dir: string
  branch: string | null
  dirty: boolean
  contextPercent: number | null
  startedAt: number
  quotas: { kind: string; label: string; percent: number; resetsAt: number | null }[]
}

export type Mood = 'idle' | 'working' | 'blocked' | 'asking' | 'done' | 'loading'

export type SessionWait = { dialog: boolean; permission: boolean; lastTurnAsked: boolean }

declare module 'claude-code' {
  interface PluginState {
    cria: {
      mood: Mood
      step: number
      isHidden: boolean
      info: Info | null
      waiting: SessionWait
    }
  }
}
