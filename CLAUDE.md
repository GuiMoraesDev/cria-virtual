# CLAUDE.md

Claude Code mod built around the Cria pixel mascot. This repository is the one mod: a floating mascot band above the prompt, with session info.

## Workflow

Before touching code, create `SCOPE.md`, `TASKS.md`, `QUESTIONS.md` and
`PROGRESS.md` in `<project-name>/` under the plan directory
`.claude/workflow.json` / `.claude/workflow.env` resolve (see plan-start). Run
`/plan-start <project-name>` to scaffold them.

The plan is split into pull requests - one topic each, under
400 changed lines of code and 600 in total counting tests and docs, generated
files excluded - and each pull request carries acceptance criteria agreed with the repo owner before any
of its tasks start. A pull request has one branch; its first task opens it as a
draft, its last marks it ready, and it reaches the default branch only when the
repo owner reviews and merges it. Its branch prefix, title prefix, labels,
assignee and stacking follow `pullRequests` in `.claude/workflow.json`.

One task per commit, applied one at a time. Every task declares the model that
must take it, and its change is made by a subagent spawned on that model. Tests
come first: each task's tests are derived from the criteria and watched failing
for the right reason before the implementation is written to make them pass.
The repo owner sees all of a pull request's tests once, up front, with why each
matters, and each pull request is reviewed by an independent opus agent before
it is marked ready. A task that changes no behaviour says so and why.

| Symbol | Model  | Scope                                                                                                                         |
| ------ | ------ | ----------------------------------------------------------------------------------------------------------------------------- |
| 🧠     | opus   | Crosses module boundaries, or touches the hooks modules' engine contract (`register.tsx`, `$.state` atoms, `types/index.d.ts`). Plans, sequencing and findings also run here |
| ⚙️     | sonnet | One layer, one surface                                                                                                        |
| 🔧     | haiku  | Mechanical, proven by the gates alone: rename, copy fix, version bump                                                         |
| 🙋     | Human  | Only the repo owner can do it: a merge, a login, a credential                                                                 |

The tier binds the subagent that makes the change, and the mapping lives in
`.claude/workflow.json`. A task applied on the wrong model is a deviation for the
session log even when the diff is fine.

Gates before every commit: `npm run check` - the version check, then
`claude-personal plugin validate .`, `npm run check-types`, `npm run lint`,
`claude-personal plugin test .`. The husky pre-commit hook runs it; the
version check wants `.claude-plugin/plugin.json` above origin/main's.

Commit messages and pull requests carry no AI signature - no `Co-Authored-By`
trailer for an AI, no "Generated with Claude Code" line - unless
`.claude/workflow.json` sets `aiSignature: true`.

A bug fix ships a test verified failing against the old behaviour. Deviations
from the plan go in the session log.

Git force flags are a last resort. Try the way without force first -
`--force-with-lease`, a stash, a new branch. When force is the only way, the
command's description says why it is necessary, not what it does; the guard
hook refuses a force flag without one.

Open questions live in `QUESTIONS.md`, each carrying a recommendation - why, a
concrete example per option, the cost, how to reverse it - and a ⬜ / 🚧 / ✅
status that flips the moment it is answered, and sitting in `PROGRESS.md`
directly above the task it blocks. They are put to the repo owner when the run
reaches that task and not before, and an answer given ahead of time is recorded
with where it came from, rather than re-asked. Questions are for decisions only:
anything this repository can answer, the agent reads for itself. An unanswered
question blocks its task, whatever its mark. 🟦 routine goes over in a line,
while ⚠️ critical leads with what the wrong answer costs.

## Commands

```bash
npm run check                          # the pre-commit gates, all of them
claude-personal plugin validate .      # manifest + hooks module checks
npm run check-types                    # type-check (needs the engine-laid .claude-plugin/types)
npm run lint                           # ESLint dead-code rules (typescript-eslint recommended)
claude-personal plugin test .          # *.test.ts(x) under the mod
```

## Which doc owns what

| Doc         | Owns                                                            |
| ----------- | --------------------------------------------------------------- |
| `CLAUDE.md` | the rules: workflow, commands, code standards                   |
