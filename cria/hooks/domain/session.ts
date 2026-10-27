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

export function checkVerdict(
  state: SessionState,
  { decision, agentId }: { decision: string; agentId?: string },
): SessionState {
  if (decision !== 'ask' || agentId) return state
  return { mood: 'asking', waiting: { ...state.waiting, permission: true } }
}

export function toolEnd({ waiting }: SessionState): SessionState {
  return { mood: 'working', waiting: { ...waiting, permission: false } }
}

export function promptSubmit({ waiting }: SessionState): SessionState {
  return { mood: 'working', waiting: { ...waiting, permission: false, lastTurnAsked: false } }
}
