import { expect, mock, test } from 'claude-code/testing'
import type { Engine } from 'claude-code/testing'
import type { On, RenderPropsOf } from 'claude-code'

// The world beneath the plugin: a session on opus-5.5 outside git.
function world(on: On) {
  const clock = mock.clock(on)
  on('session.model', async () => ({ value: 'claude-opus-5-5' }))
  on('session.cwd', async () => ({ value: '/work/cria-virtual' }))
  on('session.usage', async () => ({ value: { startedAt: 0, context: { window: 200_000 }, rateLimits: [] } }))
  on('process.run', async () => ({
    value: { exitCode: 128, stdout: '', stderr: '', isStdoutTruncated: false, isStderrTruncated: false },
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
