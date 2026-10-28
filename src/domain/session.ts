import type { Mood, SessionWait } from '../../types'
import { endsOnQuestion } from './mascot'

export type SessionState = { mood: Mood; waiting: SessionWait }

export function turnEnd(
  { waiting }: SessionState,
  { isAborted, answer }: { isAborted: boolean; answer: string },
): SessionState {
  const asked = !isAborted && endsOnQuestion(answer)
  return {
    mood: isAborted ? 'blocked' : asked ? 'asking' : 'done',
    waiting: { ...waiting, permission: false, lastTurnAsked: asked },
  }
}

export function permissionPrompt(
  state: SessionState,
  { notificationType, agentId }: { notificationType: string; agentId?: string },
): SessionState {
  if (notificationType !== 'permission_prompt' || agentId) return state
  return { mood: 'asking', waiting: { ...state.waiting, permission: true } }
}

export function toolEnd({ waiting }: SessionState): SessionState {
  return { mood: 'working', waiting: { ...waiting, permission: false } }
}

export function promptSubmit({ waiting }: SessionState): SessionState {
  return { mood: 'working', waiting: { ...waiting, permission: false, lastTurnAsked: false } }
}
