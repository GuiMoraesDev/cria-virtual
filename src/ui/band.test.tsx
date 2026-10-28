import { expect, mock, test } from 'claude-code/testing'
import type { Engine } from 'claude-code/testing'
import type { On, RenderElement, RenderPropsOf } from 'claude-code'

// The world beneath the plugin: a session on opus-5.5 outside git.
function world(
  on: On,
  usage: { percent?: number; rateLimits: { kind: string; percentUsed: number; resetsAt: string | null }[] } = { rateLimits: [] },
  git: { cwd: string; run: (command: unknown) => { exitCode: number; stdout: string } } = {
    cwd: '/work/cria-virtual',
    run: () => ({ exitCode: 128, stdout: '' }),
  },
) {
  const clock = mock.clock(on)
  on('session.model', async () => ({ value: 'claude-opus-5-5' }))
  on('session.cwd', async () => ({ value: git.cwd }))
  on('session.usage', async () => ({ value: { startedAt: 0, context: { window: 200_000, percent: usage.percent }, rateLimits: usage.rateLimits } }))
  on('process.run', async (_$, e) => ({
    value: { ...git.run(e), stderr: '', isStdoutTruncated: false, isStderrTruncated: false },
  }))
  on('turn.complete', async ($, e) => ({ text: e.answer }))
  on('session.measure', async ($, e) => ({ changed: e.changed }))
  on('classic.Notification', async () => ({}))
  return { clock }
}

const bandProps = (bodyColumns: number): RenderPropsOf['AbovePrompt'] => ({
  hasSurvey: false,
  isWorking: false,
  maxRows: 10,
  bodyColumns,
  scroll: { offset: 0, bodyRows: 9 },
  view: {},
})

function mountBand($: Engine, bodyColumns: number, columns: number) {
  return $.ui.mount({
    plugin: 'cria',
    surface: 'terminal',
    component: 'AbovePrompt',
    props: bandProps(bodyColumns),
    viewport: { columns, rows: 40 },
  })
}

test('sizes the rule to bodyColumns beside a docked pane', async ($, on) => {
  world(on)
  const ui = await mountBand($, 90, 160)

  const rule = await ui.find({ type: 'Text', text: /^─+$/ })
  expect(rule?.text).toBe('─'.repeat(89))

  await ui.unmount()
})

test('draws at 0 and 4 columns without throwing', async ($, on) => {
  world(on)

  for (const bodyColumns of [0, 4]) {
    const ui = await mountBand($, bodyColumns, bodyColumns)
    expect(await ui.drawn()).toMatchObject({ type: 'Box' })
    await ui.unmount()
  }
})

test('draws next(e) when hidden, and only rule and mascot without info', async ($, on) => {
  const { clock } = world(on)
  // The engine's own band, beneath the plugins: what next(e) reaches.
  on('ui.render', async ($, e) => $.ui.resolve(e).Text({ children: 'engine band' }))

  const shown = await mountBand($, 90, 160)
  expect(await shown.find({ type: 'Text', text: /^─+$/ })).toBeDefined()
  expect(await shown.find({ text: 'engine band' })).toBeUndefined()
  expect(await shown.find({ text: /🧠/ })).toBeUndefined()
  expect(await shown.find({ text: /📁/ })).toBeUndefined()
  await shown.unmount()

  await $.command.run({ command: 'cria', args: '' })
  await clock.settle()

  const hidden = await mountBand($, 90, 160)
  expect(await hidden.find({ text: 'engine band' })).toBeDefined()
  expect(await hidden.find({ type: 'Text', text: /^─+$/ })).toBeUndefined()
  await hidden.unmount()
})

// Full info: no git branch, 42% context, two quotas without a reset time. Measured in cells
// (an emoji is 2, the timer 6): model/dir 15, timer/context 18 with its margin, quotas 15,
// mascot 13. One row needs 15 + 2 + 18 + 2 + 15 + 13 = 65; with the quotas below, 35 + 13 = 48.
const FULL_USAGE = {
  percent: 42,
  rateLimits: [
    { kind: 'five_hour', percentUsed: 30, resetsAt: null },
    { kind: 'seven_day', percentUsed: 10, resetsAt: null },
  ],
}

type Drawn = { type: string; props?: { flexDirection?: string }; children?: unknown[] }

const isNode = (child: unknown): child is Drawn => typeof child === 'object' && child !== null
const textOf = (node: unknown): string => (isNode(node) ? (node.children ?? []).map(textOf).join('') : String(node))

// The lowest Box whose subtree shows every pattern: the parent that holds those groups together.
function lowestBoxHolding(node: Drawn, patterns: RegExp[]): Drawn | undefined {
  if (!patterns.every(pattern => pattern.test(textOf(node)))) return undefined
  const deeper = (node.children ?? []).filter(isNode).map(child => lowestBoxHolding(child, patterns))
  return deeper.find(Boolean) ?? (node.type === 'Box' ? node : undefined)
}

const directionHolding = (tree: RenderElement, ...patterns: RegExp[]) =>
  lowestBoxHolding(tree as Drawn, patterns)?.props?.flexDirection ?? 'row'

const MODEL = /🧠/
const CONTEXT = /⏱/
const QUOTAS = /session/
const MASCOT = /▀|▄/

test('AC-3, AC-4: the groups sit in a row, then the quotas drop below, then the branch group drops under model/dir', async ($, on) => {
  const { clock } = world(on, FULL_USAGE)
  await $.turn.complete({ answer: 'ok', durationMs: 1, isAborted: false, turnId: 't1', reason: 'answer' })
  await clock.settle()

  const wide = await mountBand($, 65, 65)
  const row = await wide.drawn()
  expect(directionHolding(row, MODEL, CONTEXT, QUOTAS)).toBe('row')
  await wide.unmount()

  const narrower = await mountBand($, 64, 64)
  const below = await narrower.drawn()
  expect(directionHolding(below, MODEL, CONTEXT, QUOTAS)).toBe('column')
  expect(directionHolding(below, MODEL, CONTEXT)).toBe('row')
  expect(directionHolding(below, MODEL, MASCOT)).toBe('row')
  await narrower.unmount()

  const fold = await mountBand($, 47, 47)
  const column = await fold.drawn()
  expect(directionHolding(column, MODEL, CONTEXT)).toBe('column')
  expect(directionHolding(column, MODEL, MASCOT)).toBe('row')
  await fold.unmount()
})

// The Boxes from the root down to the lowest one whose subtree shows every pattern.
function pathHolding(node: Drawn, patterns: RegExp[]): Drawn[] {
  if (!patterns.every(pattern => pattern.test(textOf(node)))) return []
  const deeper = (node.children ?? []).filter(isNode).map(child => pathHolding(child, patterns)).find(path => path.length > 0)
  return [...(node.type === 'Box' ? [node] : []), ...(deeper ?? [])]
}

// Full usage: widest group is the 18-cell branch group, so info-column fits at 18 + 13 = 31.
test('AC-5: below the info-column fit the mascot sits on its own row above the info, aligned right', async ($, on) => {
  const { clock } = world(on, FULL_USAGE)
  await $.turn.complete({ answer: 'ok', durationMs: 1, isAborted: false, turnId: 't1', reason: 'answer' })
  await clock.settle()

  const ui = await mountBand($, 30, 30)
  const tree = (await ui.drawn()) as Drawn

  const holder = pathHolding(tree, [MODEL, MASCOT]).at(-1)
  expect(holder?.props?.flexDirection).toBe('column')
  const children = (holder?.children ?? []).filter(isNode)
  const mascotAt = children.findIndex(child => MASCOT.test(textOf(child)))
  const infoAt = children.findIndex(child => MODEL.test(textOf(child)))
  expect(mascotAt).toBeGreaterThanOrEqual(0)
  expect(mascotAt).toBeLessThan(infoAt)

  const aligned = pathHolding(tree, [MASCOT]).some(box => (box.props as { alignSelf?: string } | undefined)?.alignSelf === 'flex-end')
  expect(aligned).toBe(true)

  await ui.unmount()
})

test('AC-6: the mascot is 4 rows by 12 cells that never shrink at 13 columns, and is not drawn at 12', async ($, on) => {
  const { clock } = world(on, FULL_USAGE)
  await $.turn.complete({ answer: 'ok', durationMs: 1, isAborted: false, turnId: 't1', reason: 'answer' })
  await clock.settle()

  const fits = await mountBand($, 13, 13)
  const tree = (await fits.drawn()) as Drawn
  const sprite = pathHolding(tree, [MASCOT]).at(-1)
  const rows = (sprite?.children ?? []).filter(isNode)
  expect(rows).toHaveLength(4)
  expect(rows.map(row => textOf(row).length)).toEqual([12, 12, 12, 12])
  expect((sprite?.props as { flexShrink?: number } | undefined)?.flexShrink).toBe(0)
  await fits.unmount()

  const narrow = await mountBand($, 12, 12)
  expect(await narrow.find({ text: MASCOT })).toBeUndefined()
  expect(pathHolding((await narrow.drawn()) as Drawn, [MASCOT])).toHaveLength(0)
  await narrow.unmount()
})

// A session in git on a long branch with uncommitted changes: process.run answers the two
// git calls register.tsx makes (rev-parse for the branch, diff --quiet for the dirty state).
const LONG_DIR = '/work/' + 'd'.repeat(34)
const LONG_BRANCH = 'feat/' + 'b'.repeat(35)

function worldInDirtyBranch(on: On) {
  return world(on, FULL_USAGE, {
    cwd: LONG_DIR,
    run: command => {
      const isDiff = JSON.stringify(command).includes('"diff"')
      return { exitCode: isDiff ? 1 : 0, stdout: isDiff ? '' : LONG_BRANCH + '\n' }
    },
  }).clock
}

type TextNode = Drawn & { props?: { wrap?: string } }

function textsMatching(node: Drawn, pattern: RegExp): TextNode[] {
  const own = node.type === 'Text' && pattern.test(textOf(node)) ? [node] : []
  return [...own, ...(node.children ?? []).filter(isNode).flatMap(child => textsMatching(child, pattern))]
}

// The innermost Text that carries the pattern: the node a wrap prop would sit on.
const innermostText = (tree: RenderElement, pattern: RegExp) => textsMatching(tree as Drawn, pattern).at(-1)

test('AC-7: the dir truncates keeping its end and the branch truncates with an ellipsis', async ($, on) => {
  const clock = worldInDirtyBranch(on)
  await $.turn.complete({ answer: 'ok', durationMs: 1, isAborted: false, turnId: 't1', reason: 'answer' })
  await clock.settle()

  const ui = await mountBand($, 30, 30)
  const tree = await ui.drawn()

  expect(innermostText(tree, /📁/)?.props?.wrap).toBe('truncate-start')
  expect(innermostText(tree, /🌿/)?.props?.wrap).toBe('truncate-end')

  await ui.unmount()
})

test('AC-7: the dirty * is its own Text node outside the truncated branch Text', async ($, on) => {
  const clock = worldInDirtyBranch(on)
  await $.turn.complete({ answer: 'ok', durationMs: 1, isAborted: false, turnId: 't1', reason: 'answer' })
  await clock.settle()

  const ui = await mountBand($, 30, 30)
  const tree = await ui.drawn()

  expect(innermostText(tree, /🌿/)).toBeDefined()
  const star = textsMatching(tree as Drawn, /^\*$/)
  expect(star).toHaveLength(1)
  expect(textOf(innermostText(tree, /🌿/))).not.toContain('*')

  await ui.unmount()
})
