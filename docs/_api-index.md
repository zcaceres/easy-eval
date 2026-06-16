---
title: API Overview
pageClass: vc-page-api
outline: [2, 3]
---

<div class="vc-hero-display">
  <span class="word">import {</span>
  <span class="word accent small">api} from</span>
  <span class="word accent small">"vibecheck";</span>
</div>

<div class="vc-hero-lede">
  <div class="head">The entire public surface fits on this page. Two helpers, four built-in judges, a dozen types. Everything else is internal — if it's not listed here, it isn't stable.</div>
</div>

<div class="vc-fn-card">
  <div class="chrome">
    <span class="kind">Function</span>
    <span class="name">defineConfig</span>
    <span class="sig">(config: EvalConfig) → EvalConfig</span>
    <span class="path">vibecheck/index.ts</span>
  </div>
  <div class="row">
    <div class="copy">
      <div class="head">The single entry point.</div>
      <div class="body">A pass-through helper that gives you full type inference on the config shape. Export the call as default from <code>vibecheck.config.ts</code> and the CLI picks it up automatically.</div>
      <div class="chip">Stable · since 0.1.0</div>
    </div>
<div class="preview">
<div><span class="keyword">import</span> { defineConfig, vibecheck } <span class="keyword">from</span></div>
<div>&nbsp;&nbsp;<span class="string">"@zcaceres/vibecheck"</span>;</div>
<div>&nbsp;</div>
<div><span class="keyword">export default</span> defineConfig({</div>
<div>&nbsp;&nbsp;evals: {</div>
<div>&nbsp;&nbsp;&nbsp;&nbsp;reviews: {</div>
<div>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;eval: <span class="keyword">async</span> (ctx) =&gt; generate(ctx),</div>
<div>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;judge: vibecheck(),</div>
<div>&nbsp;&nbsp;&nbsp;&nbsp;},</div>
<div>&nbsp;&nbsp;},</div>
<div>});</div>
</div>
  </div>
</div>

<div class="vc-fn-card">
  <div class="chrome">
    <span class="kind">Function</span>
    <span class="name">fromZod</span>
    <span class="sig">(schema, overrides?: ZodOverrides) → DiffSchema</span>
    <span class="path">vibecheck/index.ts</span>
  </div>
  <div class="row">
    <div class="copy">
      <div class="head">Derive a diffSchema from a Zod schema.</div>
      <div class="body">Converts a Zod object schema into a vibecheck <code>DiffSchema</code> so <code>report</code>, <code>merge</code>, and <code>changes</code> render structured section diffs without hand-writing section configs. Pass <code>overrides</code> to tune or drop individual fields. Zod is an optional peer dependency.</div>
      <div class="chip">Stable · since 0.1.0</div>
    </div>
<div class="preview">
<div><span class="keyword">import</span> { fromZod } <span class="keyword">from</span> <span class="string">"@zcaceres/vibecheck"</span>;</div>
<div>&nbsp;</div>
<div>&nbsp;&nbsp;reviews: {</div>
<div>&nbsp;&nbsp;&nbsp;&nbsp;eval: <span class="keyword">async</span> (ctx) =&gt; generate(ctx),</div>
<div>&nbsp;&nbsp;&nbsp;&nbsp;diffSchema: fromZod(ReviewSchema),</div>
<div>&nbsp;&nbsp;},</div>
</div>
  </div>
</div>

<div class="vc-section-h2">
  <div class="left">
    <span class="mark"></span>
    <span class="title">Judges</span>
  </div>
  <span class="counter">4 exports</span>
</div>

<div class="vc-judges-grid">
  <div class="vc-judge-cell red">
    <div class="tag">Judge · default</div>
    <div class="name">vibecheck</div>
    <div class="sig">(opts?: VibecheckOpts) → EvalMethod</div>
    <div class="body">Section-aware structural diff. Auto-diffs JSON when no schema is provided; honors <code>EvalDef.diffSchema</code> when one is. The right default for almost everything.</div>
  </div>
  <div class="vc-judge-cell teal">
    <div class="tag">Judge · strict</div>
    <div class="name">exactMatch</div>
    <div class="sig">(opts?: ExactOpts) → EvalMethod</div>
    <div class="body">Deep equality. Pass only when the run output is byte-identical to golden. Useful for deterministic pipelines, configs, snapshots.</div>
  </div>
  <div class="vc-judge-cell mustard">
    <div class="tag">Judge · tolerant</div>
    <div class="name">fuzzyMatch</div>
    <div class="sig">(opts?: FuzzyOpts) → EvalMethod</div>
    <div class="body">Normalized comparison with Levenshtein and numeric tolerance. Designed for messy strings: whitespace, casing, near-duplicates.</div>
  </div>
  <div class="vc-judge-cell pink">
    <div class="tag">Judge · llm</div>
    <div class="name">llmJudge</div>
    <div class="sig">(opts: LlmJudgeOpts) → EvalMethod</div>
    <div class="body">Bring your own LLM. You supply <code>call()</code> and an optional rubric; vibecheck handles the prompt scaffolding, parsing, and cost reporting.</div>
  </div>
</div>

<div class="vc-section-h2">
  <div class="left">
    <span class="mark" style="background-color: var(--vc-pink); transform: none; border-radius: 50%;"></span>
    <span class="title">Types</span>
  </div>
  <span class="counter">12 exports</span>
</div>

<div class="vc-types">
  <div class="vc-type"><span class="index">T·01</span><span class="name">EvalConfig</span><span class="body">Top-level config returned by <code>defineConfig</code>. Holds the evals map and optional storage settings.</span><span class="kind">type</span></div>
  <div class="vc-type"><span class="index">T·02</span><span class="name">EvalDef&lt;T&gt;</span><span class="body">A single eval target: the eval function, optional judge, optional diffSchema, optional inputs.</span><span class="kind">type</span></div>
  <div class="vc-type"><span class="index">T·03</span><span class="name">EvalContext</span><span class="body">Passed to your eval function. Exposes datasetId, inputs, vars, reportCost(), reportMeta().</span><span class="kind">type</span></div>
  <div class="vc-type"><span class="index">T·04</span><span class="name">EvalMethod</span><span class="body">Judge signature: (JudgeInput) → Promise&lt;EvalVerdict&gt;. Build your own to plug into <code>EvalDef.judge</code>.</span><span class="kind">type</span></div>
  <div class="vc-type"><span class="index">T·05</span><span class="name">JudgeInput</span><span class="body">What every judge receives: { run, golden, evalDef }. Everything you need to make a verdict.</span><span class="kind">type</span></div>
  <div class="vc-type"><span class="index">T·06</span><span class="name">EvalVerdict</span><span class="body">What every judge returns: { diff, pass, summary, metadata? }. The summary is what the CLI prints.</span><span class="kind">type</span></div>
  <div class="vc-type"><span class="index">T·07</span><span class="name">Golden&lt;T&gt;</span><span class="body">A blessed reference: { blessedAt, datasetId, worker, output }. Lives in <code>.vibecheck/</code>.</span><span class="kind">type</span></div>
  <div class="vc-type"><span class="index">T·08</span><span class="name">EvalRun&lt;T&gt;</span><span class="body">A run snapshot: { timestamp, datasetId, worker, durationMs, cost, output }.</span><span class="kind">type</span></div>
  <div class="vc-type"><span class="index">T·09</span><span class="name">DiffResult</span><span class="body">Section-based diff output: { sections: SectionDiff[], summary }. Rendered by the report and merge UIs.</span><span class="kind">type</span></div>
  <div class="vc-type"><span class="index">T·10</span><span class="name">SectionConfig</span><span class="body">Discriminated union: scalar | keyed-array | set | ordered-array. Drives schema-aware diffs.</span><span class="kind">type</span></div>
  <div class="vc-type"><span class="index">T·11</span><span class="name">Change</span><span class="body">A codified improvement: { timestamp, datasetId, worker, runTimestamp, inputs, vars, diff, note }.</span><span class="kind">type</span></div>
  <div class="vc-type"><span class="index">T·12</span><span class="name">SweepDatasetResult</span><span class="body">Per-dataset row from a sweep: { datasetId, status, diff, durationMs, cost, error }.</span><span class="kind">type</span></div>
</div>

<div class="vc-pagenav">
  <a href="/cli" class="prev">
    <div class="step">← Previous</div>
    <div class="title">Exit codes</div>
  </a>
  <a href="/api/README" class="next">
    <div class="step">Next →</div>
    <div class="title">All exports</div>
  </a>
</div>
