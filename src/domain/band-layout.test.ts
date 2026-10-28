import { expect, test } from 'claude-code/testing'

import type { Info } from '../../types'
import { bandLayout } from './band-layout'

// Cell widths, counting an emoji as 2 cells (the timer glyph included), a timer as 6 cells
// and a quota reset as 6 (session) or 9 (weekly) cells when it has a reset time.
//   model/dir      "🧠 [opus-5.5 · high]" = 20, "📁 cria-virtual" = 15              -> 20
//   branch/timer   "🌿 main" 7 + gap 2 + "⏱ " + timer 9 = 18; context line 17       -> 18, +1 margin = 19
//   quotas         "😌 session 30%" 14, "📅 weekly 10%" 13                            -> 14, +1 margin = 15
//   mascot         12 + 1 margin = 13
//   row            20 + 2 + 19 + 2 + 15 + 13 = 71
//   quotas-below   (20 + 2 + 19) + 13 = 54
const info: Info = {
  model: 'opus-5.5',
  effort: 'high',
  dir: 'cria-virtual',
  branch: 'main',
  dirty: false,
  contextPercent: 42,
  startedAt: 0,
  quotas: [
    { kind: 'five_hour', label: 'session', percent: 30, resetsAt: null },
    { kind: 'seven_day', label: 'weekly', percent: 10, resetsAt: null },
  ],
}

const ROW_FIT = 71
const QUOTAS_BELOW_FIT = 54

// A 31-cell branch widens the branch group by 27 cells: row 98, quotas-below 81.
const longer: Info = { ...info, branch: 'feat/very-long-branch-name-here' }
const LONGER_ROW_FIT = 98
const LONGER_QUOTAS_BELOW_FIT = 81

test('AC-3: bandLayout is one row at the measured fit width and folds the quotas one column narrower', () => {
  expect(bandLayout(ROW_FIT, info)).toBe('row')
  expect(bandLayout(ROW_FIT + 30, info)).toBe('row')
  expect(bandLayout(ROW_FIT - 1, info)).toBe('quotas-below')
})

test('AC-4: bandLayout folds the branch group under model/dir one below the quotas-below fit', () => {
  expect(bandLayout(QUOTAS_BELOW_FIT, info)).toBe('quotas-below')
  expect(bandLayout(QUOTAS_BELOW_FIT - 1, info)).toBe('info-column')
  expect(bandLayout(20, info)).toBe('info-column')
})

test('AC-3, AC-4: a longer branch folds at a wider column', () => {
  expect(bandLayout(80, info)).toBe('row')
  expect(bandLayout(80, longer)).toBe('info-column')

  expect(bandLayout(LONGER_ROW_FIT, longer)).toBe('row')
  expect(bandLayout(LONGER_ROW_FIT - 1, longer)).toBe('quotas-below')
  expect(bandLayout(LONGER_QUOTAS_BELOW_FIT, longer)).toBe('quotas-below')
  expect(bandLayout(LONGER_QUOTAS_BELOW_FIT - 1, longer)).toBe('info-column')
})
