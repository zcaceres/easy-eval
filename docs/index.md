---
title: vibecheck
pageClass: vc-page-home
outline: [2, 3]
---

<div class="vc-hero-display">
  <span class="word">vibe</span>
  <span class="word accent">check.</span>
</div>

<div class="vc-hero-lede">
  <div class="head">Bless a golden output. Re-run your generator. Diff the result. Merge improvements back in.</div>
  <div class="sub">A small toolkit for evaluating structured LLM outputs against a reference you trust. Bun-only, project-local storage, pluggable judges.</div>
</div>

<div class="vc-cta-row">
  <a class="vc-cta vc-cta-primary" href="/guide/getting-started">Get started <span>→</span></a>
  <a class="vc-cta vc-cta-secondary" href="https://github.com/zcaceres/vibecheck">★ GitHub</a>
  <span class="vc-cta vc-cta-install"><span class="prompt">$</span>bun add -d vibecheck<span class="copy">⎘</span></span>
</div>

<div class="vc-section-h2">
  <div class="left">
    <span class="mark"></span>
    <span class="title">What you get</span>
  </div>
  <span class="counter">§ 01 / 03</span>
</div>

<div class="vc-feature-grid">
  <div class="vc-feature-cell">
    <div class="vc-feature-eyebrow">01</div>
    <div class="vc-feature-title red">bless</div>
    <div class="vc-feature-body">Promote any run to a golden reference. Commit it to git like a snapshot you trust.</div>
  </div>
  <div class="vc-feature-cell">
    <div class="vc-feature-eyebrow">02</div>
    <div class="vc-feature-title teal">eval</div>
    <div class="vc-feature-body">Re-run your generator with the same inputs. vibecheck compares against the golden and prints what changed.</div>
  </div>
  <div class="vc-feature-cell">
    <div class="vc-feature-eyebrow">03</div>
    <div class="vc-feature-title mustard">diff</div>
    <div class="vc-feature-body">Section-aware diffs that respect your schema. Scalars, keyed arrays, sets, ordered lists — each with the right comparison.</div>
  </div>
  <div class="vc-feature-cell">
    <div class="vc-feature-eyebrow">04</div>
    <div class="vc-feature-title pink">merge</div>
    <div class="vc-feature-body">Interactively codify regressions back into golden. Approve, reject, or edit each change. Improvements land in source.</div>
  </div>
</div>

<div class="vc-section-h2">
  <div class="left">
    <span class="mark" style="background-color: var(--vc-teal); border-radius: 50%; transform: none;"></span>
    <span class="title">Quick start</span>
  </div>
  <span class="counter">§ 02 / 03</span>
</div>

<div class="vc-steps">
  <div class="vc-step">
    <div class="num">1.</div>
    <div class="body">
      <div class="title">Scaffold a config</div>
      <div class="vc-term-line"><span class="prompt">$</span>bunx vibecheck init</div>
      <div class="note">Drops a typed <code>vibecheck.config.ts</code> and a <code>.vibecheck/</code> folder into your project root.</div>
    </div>
  </div>
  <div class="vc-step">
    <div class="num">2.</div>
    <div class="body">
      <div class="title">Bless your first golden</div>
      <div class="vc-term-line"><span class="prompt">$</span>vibecheck bless reviews</div>
      <div class="note">Run your eval once, then promote the output as the reference for the "reviews" dataset.</div>
    </div>
  </div>
  <div class="vc-step">
    <div class="num">3.</div>
    <div class="body">
      <div class="title">Run an eval against golden</div>
      <div class="vc-term-line"><span class="prompt">$</span>vibecheck eval reviews</div>
      <div class="note">vibecheck re-runs your generator and prints a section-by-section diff. Pass = nothing changed.</div>
    </div>
  </div>
</div>

<div class="vc-section-h2">
  <div class="left">
    <span class="mark" style="background-color: var(--vc-pink); border-radius: 50%; transform: none;"></span>
    <span class="title">Pick your path</span>
  </div>
  <span class="counter">§ 03 / 03</span>
</div>

<div class="vc-paths">
  <a class="vc-path" href="/guide/getting-started">
    <div class="icon yellow">G</div>
    <div class="text">
      <div class="eyebrow">Guide</div>
      <div class="title">Learn the bless / eval / merge loop</div>
      <div class="desc">Walk through the full workflow from a fresh repo to a stable golden you trust.</div>
    </div>
    <div class="read">READ →</div>
  </a>
  <a class="vc-path" href="/guide/judges">
    <div class="icon teal">J</div>
    <div class="text">
      <div class="eyebrow">Judges</div>
      <div class="title">Pick the right comparison</div>
      <div class="desc">vibecheck, exactMatch, fuzzyMatch, llmJudge — plus how to write your own.</div>
    </div>
    <div class="read">READ →</div>
  </a>
  <a class="vc-path" href="/cli">
    <div class="icon mustard">C</div>
    <div class="text">
      <div class="eyebrow">CLI</div>
      <div class="title">Drive vibecheck from the terminal</div>
      <div class="desc">Every command, every flag, every exit code. Agent-friendly.</div>
    </div>
    <div class="read">READ →</div>
  </a>
  <a class="vc-path" href="/api/">
    <div class="icon pink">A</div>
    <div class="text">
      <div class="eyebrow">API</div>
      <div class="title">Wire vibecheck into your code</div>
      <div class="desc">defineConfig, judges, types — the entire public surface.</div>
    </div>
    <div class="read">READ →</div>
  </a>
</div>
