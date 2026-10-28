import { atom, read } from "claude-code";
import type { EngineInterface, Next, RenderInput } from "claude-code";

import type { Info, Mood } from "../../types";
import { bandLayout } from "../domain/band-layout";
import { mascotFrame } from "../domain/mascot";
import { MascotSprite } from "./MascotSprite";
import { SessionInfo } from "./SessionInfo";

const mood = atom({ plugin: "cria", key: "mood" } as const, "idle" as Mood);
const step = atom({ plugin: "cria", key: "step" } as const, 0);
const info = atom(
  { plugin: "cria", key: "info" } as const,
  null as Info | null,
);
const isHidden = atom({ plugin: "cria", key: "isHidden" } as const, false);

export async function renderBand(
  $: EngineInterface,
  e: RenderInput<"AbovePrompt">,
  next: Next<"ui.render", RenderInput<"AbovePrompt">>,
) {
  if (await read($, isHidden)) return next(e);

  const ui = $.ui.resolve(e);
  const { Box, Text } = ui;
  const cells = mascotFrame(await read($, mood), await read($, step));

  const details = await read($, info);
  const now = await $.clock.now();

  const stage = bandLayout(e.props.bodyColumns, details);
  const mascot = (
    <Box
      marginRight={1}
      alignSelf={stage === "mascot-above" ? "flex-end" : undefined}
    >
      <MascotSprite ui={ui} cells={cells} />
    </Box>
  );

  return (
    <Box flexDirection="column">
      <Text color="#f2f2f2" dimColor>
        {"─".repeat(Math.max(0, e.props.bodyColumns - 1))}
      </Text>
      <Box
        flexDirection={stage === "mascot-above" ? "column" : "row"}
        justifyContent="space-between"
        alignItems="center"
      >
        {stage === "mascot-above" && mascot}
        <SessionInfo ui={ui} details={details} now={now} stage={stage} />
        {stage !== "mascot-above" && stage !== "no-mascot" && mascot}
      </Box>
    </Box>
  );
}
