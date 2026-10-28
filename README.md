# Cria

[![claude code](https://img.shields.io/badge/claude%20code-mod-D97757?logo=claude)](https://docs.claude.com/en/docs/claude-code/plugins)
[![typescript](https://img.shields.io/badge/typescript-5-3178C6?logo=typescript)](https://www.typescriptlang.org/)
[![node](https://img.shields.io/badge/node-npm-339933?logo=nodedotjs)](https://nodejs.org/en/download)
[![license](https://img.shields.io/badge/license-MIT-blue)](LICENSE)
</br>
<small>Every badge is a link to its docs</small>

</br>

## Description of that project 📖

Cria is a [Claude Code](https://docs.claude.com/en/docs/claude-code) mod built around a
pixel mascot. A floating band above the prompt shows the mascot reacting to what Claude
is doing, with the session info beside it:

- 🎭 **A mascot that follows the work.** It changes mood as Claude runs tools, asks for permission, finishes or stops.
- 📊 **Session info at a glance.** Model, directory, git branch, time, context window and rate limits, all in the same band.
- 🙈 **Out of the way when you want.** One command hides the band and brings it back.

## Requirements 🛑

To use it, you will need this in your environment:

- [Claude Code](https://docs.claude.com/en/docs/claude-code/setup) with mod (hooks module) support

To work on it, you will also need:

- [Node and npm](https://nodejs.org/en/download), for `npm install`, which also sets up the husky hooks

## Installing the plugin 🧰

Add the marketplace and install the plugin from inside Claude Code:

```sh
/plugin marketplace add GuiMoraesDev/cria-virtual
/plugin install cria@cria-virtual
```

> 💡 To install from a local checkout instead, pass its path to `/plugin marketplace add`.

## What it shows 🎁

### The mascot

| Mood | When |
| --- | --- |
| `idle` | Nothing is happening |
| `working` | You sent a prompt, or a tool is running |
| `asking` | A permission prompt is open, an `AskUserQuestion` is open, or the turn ended on a question |
| `done` | The turn ended; it goes back to `idle` after about 4 seconds |
| `blocked` | The turn was aborted |
| `loading` | The conversation is being compacted |

### Session info

- 🧠 The model, and 📁 the current directory
- 🌿 The git branch, with `*` when the working tree has changes
- ⏱ How long the session has run
- A context window meter with its percentage
- Your rate-limit quotas, each with its percentage and when it resets: a countdown for the 5-hour window, a weekday and time for the weekly one

### Commands

| Command | What it does |
| --- | --- |
| `/cria` | Hides the band ("Cria hidden") or shows it again ("Cria is back") |

## What it runs and hooks 🔍

### Programs it runs

Only `git`, read-only, in the session's working directory. It runs when the session starts, on `session.measure`, and after each main turn. If the first command finds no branch, the second is skipped.

| Command | Why |
| --- | --- |
| `git -C <cwd> rev-parse --abbrev-ref HEAD` | Reads the branch name shown in the band |
| `git -C <cwd> diff --quiet --ignore-submodules HEAD` | Checks whether the tree has changes, shown as `*` |

No other program is run.

### Data it reads, and where it goes

The session's model, effort, working directory, usage (context %, rate limits, start time) and the last turn's answer text, which is only checked for a trailing `?`. All of it stays in the band. The mod makes no network calls and sends nothing off the machine.

### Hooks

| Hook | What it does |
| --- | --- |
| `session.start` | Starts the mascot animation, registers `/cria`, loads the session info |
| `command.run` (`/cria`) | Toggles the band; no other command is touched |
| `session.compact` | Shows the `loading` mood while compacting, then `idle` |
| `session.measure` | Refreshes the session info |
| `prompt.submit` | Sets the `working` mood |
| `classic.Notification` | Observes a main-session `permission_prompt` to show the `asking` mood; it makes no permission decision |
| `tool.call` | Sets the mood around a tool run and passes the call on unchanged |
| `tool.call` (`AskUserQuestion`) | Holds the `asking` mood while the question is open and passes the call on unchanged |
| `turn.step` | Reads the effort for the band and passes the step on |
| `turn.complete` | Sets `done`, `asking` or `blocked`, and refreshes the session info |
| `ui.render` (`AbovePrompt`) | Draws the band |

The mod never approves, denies or changes a tool call, a permission or a setting. Apart from answering `/cria`, it passes every event on unchanged.

## Project Maintenance 👨‍🔧

- `.claude-plugin/` holds the manifest and the marketplace entry, `src/` holds `hooks.json` and `register.tsx` plus the `domain/` logic and the `ui/` components, and `types/` holds the engine types.
- `npm run check` runs the gates: the version check (`.husky/scripts/check-version.js`), plugin validation, the type check and the tests. The husky pre-commit hook runs it for you.
- The `version` in `.claude-plugin/plugin.json` must go above the one on `main` on every pull request, or the version check fails.
- Commits follow [Conventional Commits](https://www.conventionalcommits.org/).
- The workflow and the code rules live in [`CLAUDE.md`](CLAUDE.md).
