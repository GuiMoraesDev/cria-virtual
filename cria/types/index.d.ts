export type Mood = 'idle' | 'working' | 'blocked' | 'asking' | 'done' | 'loading'

declare module 'claude-code' {
  interface PluginState {
    cria: { mood: Mood; step: number; isHidden: boolean }
  }
}
