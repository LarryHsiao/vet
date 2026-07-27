---
description: Check a feature an AI assistant built, before handing it to an engineer
argument-hint: '[all | recent | <folder>] ["what you asked for"] [--gated]'
allowed-tools: [Read, Glob, Grep, Bash, Agent, AskUserQuestion]
---

Run the Vet quality check.

Read `${CLAUDE_PLUGIN_ROOT}/skills/vet/SKILL.md` and follow it exactly, start to
finish. That file is the whole procedure — do not improvise around it, and do
not summarize its report format from memory.

The user invoked this with: $ARGUMENTS

Pass those arguments through to the skill's argument parsing (Step 1). If
`$ARGUMENTS` is empty, that is the normal case: the skill auto-detects what to
check.

If the path above still contains the literal text `${CLAUDE_PLUGIN_ROOT}` when
you try to read it, the variable was not substituted. Say so plainly and stop —
do not guess a path and do not proceed without the checks, because a Vet report
with no checks in it is worse than no report.
