---
title: Getting Started
pageClass: vc-page-guide
outline: [2, 3]
guideProgress: { step: 2, total: 5 }
---

<div class="vc-hero-display">
  <span class="word">Getting</span>
  <span class="word accent small">started.</span>
</div>

<div class="vc-hero-lede">
  <div class="head">Five steps from an empty project to a working evaluation loop. By the end you'll have a golden reference, a passing baseline, and a diff that catches drift the moment it happens.</div>
</div>

<h2 id="pre-requisite" class="vc-sr-only">Pre-requisite</h2>

<div class="vc-prereq">
  <div class="tag">Pre-req</div>
  <div class="copy">
    <strong>Bun installed (≥ 1.1.0). No Node, no tsx.</strong>
    <span>vibecheck loads <code>vibecheck.config.ts</code> via Bun's native TypeScript runtime. If you don't have Bun yet, run <code>curl -fsSL https://bun.sh/install | bash</code>.</span>
  </div>
</div>

<div class="vc-spine">
  <div class="vc-spine-step">
    <div class="badge">
      <div class="num">01</div>
      <div class="min">~1 min</div>
    </div>
    <div class="body">
      <h2 id="install" class="title">Install</h2>
      <div class="lede">Add vibecheck as a dev dependency. It exposes a single binary (<code>vibecheck</code>) you'll call from package.json scripts or directly via <code>bunx</code>.</div>
<div class="vc-terminal">
<span class="label">Shell</span>
<pre><span class="prompt">$</span> bun add -d vibecheck
<span class="comment"># or run without installing</span>
<span class="prompt">$</span> bunx vibecheck --help</pre>
</div>
    </div>
  </div>

  <div class="vc-spine-step">
    <div class="badge">
      <div class="num">02</div>
      <div class="min">~30 sec</div>
    </div>
    <div class="body">
      <h2 id="initialize" class="title">Initialize</h2>
      <div class="lede"><code>vibecheck init</code> scaffolds a typed config and a project-local <code>.vibecheck/</code> store. Everything stays in your repo — no global cache, no daemon.</div>
<div class="vc-terminal">
<span class="label">Shell</span>
<pre><span class="prompt">$</span> bunx vibecheck init
<span class="comment"># creates vibecheck.config.ts + .vibecheck/</span>
<span class="prompt">$</span> ls .vibecheck/</pre>
</div>
    </div>
  </div>

  <div class="vc-spine-step">
    <div class="badge">
      <div class="num">03</div>
      <div class="min">~3 min</div>
    </div>
    <div class="body">
      <h2 id="write-your-eval" class="title">Write your eval</h2>
      <div class="lede">Open <code>vibecheck.config.ts</code> and point <code>eval()</code> at your generator. The framework manages outputs only — you supply inputs and the function that produces the result.</div>
<div class="vc-terminal">
<span class="label">TypeScript</span>
<pre>export default defineConfig({
  evals: { reviews: { eval: async (ctx) => generate(ctx) } }
});</pre>
</div>
    </div>
  </div>

  <div class="vc-spine-step">
    <div class="badge">
      <div class="num">04</div>
      <div class="min">~1 min</div>
    </div>
    <div class="body">
      <h2 id="bless-a-golden" class="title">Bless a golden</h2>
      <div class="lede">Run your eval once and promote the output as the reference. Commit <code>.vibecheck/{worker}/{datasetId}/golden.json</code> to git like any snapshot.</div>
<div class="vc-terminal">
<span class="label">Shell</span>
<pre><span class="prompt">$</span> vibecheck bless reviews
<span class="ok">✓</span> blessed · 4 sections · saved
  <span class="arrow">→</span> .vibecheck/default/reviews/golden.json</pre>
</div>
    </div>
  </div>

  <div class="vc-spine-step">
    <div class="badge">
      <div class="num">05</div>
      <div class="min">~30 sec</div>
    </div>
    <div class="body">
      <h2 id="compare" class="title">Compare</h2>
      <div class="lede">Re-run any time. vibecheck diffs the new output against golden section-by-section and prints exactly what drifted. Codify the change or re-bless when the new output is the one you want.</div>
<div class="vc-terminal">
<span class="label">Shell</span>
<pre><span class="prompt">$</span> vibecheck eval reviews
<span class="comment"># PASS · 0 regressions · 1.84s · $0.0042</span>
<span class="prompt">$</span> echo $? <span class="arrow">→</span> 0</pre>
</div>
    </div>
  </div>
</div>

<div class="vc-pagenav">
  <a href="/" class="prev">
    <div class="step">← Previous</div>
    <div class="title">Introduction</div>
  </a>
  <a href="/guide/concepts" class="next">
    <div class="step">Next →</div>
    <div class="title">Core concepts</div>
  </a>
</div>
