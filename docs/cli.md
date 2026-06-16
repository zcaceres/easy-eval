---
title: CLI Reference
pageClass: vc-page-cli
outline: [2, 3]
exitLegend: true
---

<div class="vc-cli-hero">
  <div class="vc-hero-display">
    <span class="word accent" style="font-size: 156px; line-height: 0.9;">$ vibe-</span>
    <span class="word accent" style="font-size: 156px; line-height: 0.9;">check</span>
  </div>
  <div class="terminal">
    <span class="label">vibecheck --help</span>
    <div class="body">
      <div>Usage: vibecheck &lt;command&gt;</div>
      <div>       [options]</div>
      <div>&nbsp;</div>
      <div><span class="accent">Commands:</span></div>
      <div>&nbsp; init&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;scaffold config</div>
      <div>&nbsp; eval&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;run + diff</div>
      <div>&nbsp; bless&nbsp;&nbsp;&nbsp;&nbsp;promote golden</div>
      <div>&nbsp; … 6 more</div>
    </div>
  </div>
</div>

<div class="vc-hero-lede">
  <div class="head">Every vibecheck command. Each row lists the signature, what it does, and the exit codes you can rely on in CI. Agent-friendly: pass <code>-f json</code> for machine-readable output, or <code>--no-diff</code> on <code>eval</code> to skip the interactive codify prompt.</div>
</div>

<div class="vc-cmd-grouphead">
  <h2 id="write" class="title">Write</h2>
  <span class="blurb">Commands that change golden or config on disk.</span>
  <span class="count">3 commands</span>
</div>

<div class="vc-cmd-rows">

  <div class="vc-cmd">
    <div class="lhs">
      <h3 id="init" class="name">init</h3>
      <div class="sig"><span class="prompt">$</span>vibecheck init</div>
    </div>
    <div class="desc">
      <div class="head">Scaffold a typed config and project-local store.</div>
      <div class="body">Creates <code>vibecheck.config.ts</code> at the project root and an empty <code>.vibecheck/</code> directory. Safe to re-run — never overwrites existing files.</div>
    </div>
    <div class="exits">
      <div class="label">Exits</div>
      <div class="exit ok">0 · ok</div>
      <div class="exit bad">1 · io</div>
    </div>
  </div>

  <div class="vc-cmd">
    <div class="lhs">
      <h3 id="bless" class="name">bless</h3>
      <div class="sig"><span class="prompt">$</span>vibecheck bless &lt;id&gt;</div>
    </div>
    <div class="desc">
      <div class="head">Promote the latest run to golden.</div>
      <div class="body">Reviews the new output side-by-side, then writes <code>.vibecheck/{worker}/{datasetId}/golden.json</code>. Pass <code>--from-run &lt;ts&gt;</code> to bless a specific past run instead of the latest.</div>
    </div>
    <div class="exits">
      <div class="label">Exits</div>
      <div class="exit ok">0 · ok</div>
      <div class="exit bad">1 · err</div>
    </div>
  </div>

  <div class="vc-cmd">
    <div class="lhs">
      <h3 id="merge" class="name">merge</h3>
      <div class="sig"><span class="prompt">$</span>vibecheck merge &lt;id&gt;</div>
    </div>
    <div class="desc">
      <div class="head">Interactively codify regressions back into golden.</div>
      <div class="body">Walks each section of the latest run, prompting approve / reject / edit. Selected changes are written to golden and the choice is logged as a <code>Change</code> record.</div>
    </div>
    <div class="exits">
      <div class="label">Exits</div>
      <div class="exit ok">0 · ok</div>
      <div class="exit bad">1 · err</div>
    </div>
  </div>

</div>

<div class="vc-cmd-grouphead">
  <h2 id="run-and-read" class="title">Run &amp; read</h2>
  <span class="blurb">Re-run evals, list history, surface diffs and decisions.</span>
  <span class="count">7 commands</span>
</div>

<div class="vc-cmd-rows">

  <div class="vc-cmd">
    <div class="lhs">
      <h3 id="eval" class="name">eval</h3>
      <div class="sig"><span class="prompt">$</span>vibecheck eval &lt;id&gt;</div>
    </div>
    <div class="desc">
      <div class="head">Re-run the eval and diff against golden.</div>
      <div class="body">The primary command. Runs your eval function, applies the configured judge, prints a section-by-section diff, and saves the run to <code>.vibecheck/</code>. Exits 0 on a clean run <em>or</em> a diff — a regression doesn't fail the command. Exits 1 only on a config or output-schema error.</div>
    </div>
    <div class="exits">
      <div class="label">Exits</div>
      <div class="exit ok">0 · ok</div>
      <div class="exit bad">1 · err</div>
    </div>
  </div>

  <div class="vc-cmd">
    <div class="lhs">
      <h3 id="sweep" class="name">sweep</h3>
      <div class="sig"><span class="prompt">$</span>vibecheck sweep &lt;id&gt;</div>
    </div>
    <div class="desc">
      <div class="head">Non-interactive regression sweep across all goldens.</div>
      <div class="body">Re-runs the eval with the same <code>-v</code> variables across every other golden for this worker, printing a summary of match / regression / skipped per dataset. Pass <code>-f json</code> for machine-readable output. Always exits 0 — read the summary to gate CI yourself.</div>
    </div>
    <div class="exits">
      <div class="label">Exits</div>
      <div class="exit ok">0 · ok</div>
    </div>
  </div>

  <div class="vc-cmd">
    <div class="lhs">
      <h3 id="runs" class="name">runs</h3>
      <div class="sig"><span class="prompt">$</span>vibecheck runs &lt;id&gt;</div>
    </div>
    <div class="desc">
      <div class="head">List past eval runs for a dataset.</div>
      <div class="body">Reads <code>.vibecheck/{worker}/{datasetId}/runs/*.json</code> and prints them newest-first with timestamp, duration, cost, and pass/fail. Pipe through <code>head</code> for the latest only.</div>
    </div>
    <div class="exits">
      <div class="label">Exits</div>
      <div class="exit ok">0 · ok</div>
    </div>
  </div>

  <div class="vc-cmd">
    <div class="lhs">
      <h3 id="report" class="name">report</h3>
      <div class="sig"><span class="prompt">$</span>vibecheck report &lt;id&gt; [ts]</div>
    </div>
    <div class="desc">
      <div class="head">Show the diff report from a cached run.</div>
      <div class="body">Renders the section-by-section diff for a stored run. Pass <code>--against &lt;ts2&gt;</code> to compare two runs directly instead of run-vs-golden.</div>
    </div>
    <div class="exits">
      <div class="label">Exits</div>
      <div class="exit ok">0 · ok</div>
    </div>
  </div>

  <div class="vc-cmd">
    <div class="lhs">
      <h3 id="status" class="name">status</h3>
      <div class="sig"><span class="prompt">$</span>vibecheck status</div>
    </div>
    <div class="desc">
      <div class="head">Overview of every dataset and its golden.</div>
      <div class="body">Walks the <code>.vibecheck/</code> tree and prints one row per dataset: worker, last-bless date, last-eval result. The dashboard you reach for first thing in the morning.</div>
    </div>
    <div class="exits">
      <div class="label">Exits</div>
      <div class="exit ok">0 · ok</div>
    </div>
  </div>

  <div class="vc-cmd">
    <div class="lhs">
      <h3 id="changes" class="name">changes</h3>
      <div class="sig"><span class="prompt">$</span>vibecheck changes &lt;sub&gt;</div>
    </div>
    <div class="desc">
      <div class="head">List, show, add, or export codified changes.</div>
      <div class="body">Sub-commands: <code>list</code>, <code>show &lt;ts&gt;</code>, <code>add &lt;id&gt; [runTs]</code>, <code>export</code>. Lets you replay the human decisions that shaped golden — useful for audit trails and onboarding.</div>
    </div>
    <div class="exits">
      <div class="label">Exits</div>
      <div class="exit ok">0 · ok</div>
    </div>
  </div>

  <div class="vc-cmd">
    <div class="lhs">
      <h3 id="validate" class="name">validate</h3>
      <div class="sig"><span class="prompt">$</span>vibecheck validate</div>
    </div>
    <div class="desc">
      <div class="head">Type-check the config before you run it.</div>
      <div class="body">Loads <code>vibecheck.config.ts</code> and checks every eval function and <code>diffSchema</code>. Pass <code>--probe</code> to run each eval once and validate its output shape against the schema.</div>
    </div>
    <div class="exits">
      <div class="label">Exits</div>
      <div class="exit ok">0 · ok</div>
      <div class="exit bad">1 · err</div>
    </div>
  </div>

</div>

<div class="vc-flags-banner" id="global-flags">
  <div class="left">
    <div class="label">Global flags</div>
    <div class="body"><code>eval</code> and <code>sweep</code> accept <code>-v key=value</code> to pass eval variables. Most commands accept <code>--worker &lt;name&gt;</code> to target a specific worker (all except <code>init</code>, <code>status</code>, and <code>changes export</code>) and <code>-f, --format &lt;json|md|table&gt;</code> to switch output to a machine-readable stream. A global <code>-c, --config &lt;path&gt;</code> points at a specific config file.</div>
  </div>
  <a href="#exit-codes">Flags &amp; vars →</a>
</div>

## Exit codes

| Code | Meaning |
|------|---------|
| `0`  | Success — including an `eval`/`sweep` that found a diff (a regression does not fail the command) |
| `1`  | Config-validation error, output-schema mismatch, or a missing config / run / golden / change |

<div class="vc-pagenav">
  <a href="/guide/sweep" class="prev">
    <div class="step">← Previous</div>
    <div class="title">Regression sweep</div>
  </a>
  <a href="/api/" class="next">
    <div class="step">Next →</div>
    <div class="title">API overview</div>
  </a>
</div>
