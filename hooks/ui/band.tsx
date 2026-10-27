import { atom, read } from 'claude-code'
import type { EngineInterface, Next, RenderInput } from 'claude-code'

import type { Info, Mood } from '../../types'
import { mascotFrame } from '../domain/mascot'
import { MascotSprite } from './MascotSprite'
import { SessionInfo } from './SessionInfo'

const mood = atom({ plugin: 'cria', key: 'mood' } as const, 'idle' as Mood)
const step = atom({ plugin: 'cria', key: 'step' } as const, 0)
const info = atom({ plugin: 'cria', key: 'info' } as const, null as Info | null)
const isHidden = atom({ plugin: 'cria', key: 'isHidden' } as const, false)

export async function renderBand(
  $: EngineInterface,
  e: RenderInput<'AbovePrompt'>,
  next: Next<'ui.render', RenderInput<'AbovePrompt'>>,
) {
  if (await read($, isHidden)) return next(e)

  const ui = $.ui.resolve(e)
  const { Box } = ui
  const cells = mascotFrame(await read($, mood), await read($, step))

  const details = await read($, info)
  const now = await $.clock.now()

  return (
    <Box flexDirection="row" justifyContent="flex-end" alignItems="center">
      <SessionInfo ui={ui} details={details} now={now} />
      <Box marginRight={1}>
        <MascotSprite ui={ui} cells={cells} />
      </Box>
    </Box>
  )
}
