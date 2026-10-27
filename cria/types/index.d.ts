export type Info = {
  model: string
  dir: string
  branch: string | null
  contextPercent: number | null
  startedAt: number
  quotas: { label: string; percent: number }[]
}

export type Mood = 'idle' | 'working' | 'blocked' | 'asking' | 'done' | 'loading'

declare module 'claude-code' {
  interface PluginState {
    cria: { mood: Mood; step: number; isHidden: boolean; info: Info | null }
  }
}
