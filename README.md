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

## Project Maintenance 👨‍🔧

- `.claude-plugin/` holds the manifest and the marketplace entry, `hooks/` holds `register.tsx` plus the `domain/` logic and the `ui/` components, and `types/` holds the engine types.
- `npm run check` runs the gates: the version check (`scripts/check-version.js`), plugin validation, the type check and the tests. The husky pre-commit hook runs it for you.
- The `version` in `.claude-plugin/plugin.json` must go above the one on `main` on every pull request, or the version check fails.
- Commits follow [Conventional Commits](https://www.conventionalcommits.org/).
- The workflow and the code rules live in [`CLAUDE.md`](CLAUDE.md).
