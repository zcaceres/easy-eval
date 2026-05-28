# Regression Sweep

When you change your eval function (a new prompt, model, or pipeline tweak), you want to know if it improved *one* dataset at the cost of breaking others. The regression sweep re-runs your eval across **all** other golden datasets for the same worker and reports which ones changed.

## Two entry points

**Interactive** — built into `vibecheck eval`'s codify flow. After you see a diff and decide to codify the change, the CLI offers to sweep before saving.

**Non-interactive** — standalone command, useful for agents and CI:

```bash
vibecheck sweep my-dataset
```

Both re-run the eval with the same `-v` variables across every other golden dataset under the worker, then summarize match/regression/skipped counts per dataset. Results are saved as runs (visible in `vibecheck runs` and `vibecheck report`).

## Example

```bash
vibecheck eval invoice-march -v model=claude-opus-4
# Diff looks great — codify it
# CLI: "Sweep 8 other datasets for regressions? [Y/n] y"
#
# user-123     ✓ match
# user-456     ✗ regression (3 fields changed)
# edge-case-1  ✓ match
# ...
```

If regressions appear, you're warned before the change is saved — giving you a chance to investigate before promoting.

## Why it matters

A common failure mode of LLM eval: tune the prompt against one example, ship it, regress something else silently. The sweep makes regressions noisy by default.
