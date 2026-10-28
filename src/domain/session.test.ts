import { expect, test } from 'claude-code/testing'

import type { SessionWait } from '../../types'
import { permissionPrompt, promptSubmit, toolEnd, turnEnd } from './session'
import type { SessionState } from './session'

const state = (mood: SessionState['mood'], waiting: Partial<SessionWait> = {}): SessionState => ({
  mood,
  waiting: { dialog: false, permission: false, lastTurnAsked: false, ...waiting },
})

test('AC-9: an aborted turn is blocked and did not ask', () => {
  const next = turnEnd(state('working', { lastTurnAsked: true }), { isAborted: true, answer: 'Shall I?' })
  expect(next.mood).toBe('blocked')
  expect(next.waiting.lastTurnAsked).toBe(false)
})

test("AC-9: a turn whose answer ends in '?' is asking and lastTurnAsked", () => {
  const next = turnEnd(state('working'), { isAborted: false, answer: 'Shall I open the PR?' })
  expect(next.mood).toBe('asking')
  expect(next.waiting.lastTurnAsked).toBe(true)
})

test('AC-9: a turn ending any other way is done and not lastTurnAsked', () => {
  const next = turnEnd(state('working', { lastTurnAsked: true }), { isAborted: false, answer: 'All done.' })
  expect(next.mood).toBe('done')
  expect(next.waiting.lastTurnAsked).toBe(false)
})

test('AC-10: a main-session permission prompt is asking and permission waits', () => {
  const next = permissionPrompt(state('working'), { notificationType: 'permission_prompt', agentId: undefined })
  expect(next.mood).toBe('asking')
  expect(next.waiting.permission).toBe(true)
})

test('AC-10: when the tool call ends, permission clears and mood is working', () => {
  const next = toolEnd(state('asking', { permission: true }))
  expect(next.waiting.permission).toBe(false)
  expect(next.mood).toBe('working')
})

test("AC-10: a subagent's permission prompt changes nothing", () => {
  const before = state('working')
  expect(permissionPrompt(before, { notificationType: 'permission_prompt', agentId: 'sub-1' })).toEqual(before)
})

test('a notification other than a permission prompt changes nothing', () => {
  const before = state('working')
  expect(permissionPrompt(before, { notificationType: 'idle_prompt', agentId: undefined })).toEqual(before)
})

test('AC-11: any prompt submit is working and clears lastTurnAsked', () => {
  const next = promptSubmit(state('asking', { lastTurnAsked: true }))
  expect(next.mood).toBe('working')
  expect(next.waiting.lastTurnAsked).toBe(false)
})

test('promptSubmit leaves dialog alone', () => {
  expect(promptSubmit(state('done', { dialog: true })).waiting.dialog).toBe(true)
  expect(promptSubmit(state('done', { dialog: false })).waiting.dialog).toBe(false)
})

test('turnEnd and promptSubmit both clear waiting.permission', () => {
  const before = state('asking', { permission: true })
  expect(turnEnd(before, { isAborted: false, answer: 'Done.' }).waiting.permission).toBe(false)
  expect(promptSubmit(before).waiting.permission).toBe(false)
})

test('toolEnd always clears permission and sets working, even when permission was already false', () => {
  const next = toolEnd(state('done', { permission: false }))
  expect(next.mood).toBe('working')
  expect(next.waiting.permission).toBe(false)
})

test('turnEnd, permissionPrompt, toolEnd and promptSubmit never change dialog', () => {
  const before = state('working', { dialog: true })
  expect(turnEnd(before, { isAborted: false, answer: 'Ok?' }).waiting.dialog).toBe(true)
  expect(turnEnd(before, { isAborted: true, answer: '' }).waiting.dialog).toBe(true)
  expect(permissionPrompt(before, { notificationType: 'permission_prompt', agentId: undefined }).waiting.dialog).toBe(true)
  expect(toolEnd(before).waiting.dialog).toBe(true)
  expect(promptSubmit(before).waiting.dialog).toBe(true)
})
