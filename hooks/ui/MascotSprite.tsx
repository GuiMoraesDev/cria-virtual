import type { ElementTable } from 'claude-code'

import type { MascotCell } from '../domain/mascot'

type MascotSpriteProps = { ui: ElementTable; cells: MascotCell[][] }

export function MascotSprite({ ui: { Box, Text }, cells }: MascotSpriteProps) {
  return (
    <Box flexDirection="column">
      {cells.map((row, index) => (
        <Text key={`mascot-${index}`}>
          {row.map(({ top, bottom }, column) =>
            top ? (
              <Text key={`px-${column}`} color={top} backgroundColor={bottom}>
                ▀
              </Text>
            ) : bottom ? (
              <Text key={`px-${column}`} color={bottom}>
                ▄
              </Text>
            ) : (
              ' '
            ),
          )}
        </Text>
      ))}
    </Box>
  )
}
