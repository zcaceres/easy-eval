---
layout: page
title: vibecheck
---

<div class="vc-hero">
  <div class="vc-hero-mark"></div>
  <div class="vc-hero-stack">
    <div class="vc-hero-title">vibecheck</div>
    <div class="vc-hero-tag">A CLI for evaluating structured LLM outputs against goldens.</div>
  </div>
  <div class="vc-hero-chip">v0.1.0</div>
</div>

<div class="vc-disambig-header">
  <div class="vc-disambig-header-dot"></div>
  <div class="vc-disambig-header-text">vibecheck — may refer to:</div>
</div>

<div class="vc-disambig">
  <a class="vc-disambig-row" href="/guide/getting-started">
    <div class="vc-shape vc-shape-dot-red"></div>
    <div class="vc-disambig-intent">Run my first eval</div>
    <div class="vc-disambig-route">→ getting started</div>
  </a>
  <a class="vc-disambig-row" href="/guide/sweep">
    <div class="vc-shape vc-shape-diamond-cyan"></div>
    <div class="vc-disambig-intent">Debug a regression across datasets</div>
    <div class="vc-disambig-route">→ regression sweep</div>
  </a>
  <a class="vc-disambig-row" href="/guide/judges">
    <div class="vc-shape vc-shape-square-yellow"></div>
    <div class="vc-disambig-intent">Write a custom judge for my domain</div>
    <div class="vc-disambig-route">→ judges</div>
  </a>
  <a class="vc-disambig-row" href="/api/">
    <div class="vc-shape vc-shape-dot-pink"></div>
    <div class="vc-disambig-intent">Integrate vibecheck into my pipeline programmatically</div>
    <div class="vc-disambig-route">→ api reference</div>
  </a>
  <a class="vc-disambig-row" href="/cli">
    <div class="vc-shape vc-shape-square-ochre"></div>
    <div class="vc-disambig-intent">Look up a CLI command</div>
    <div class="vc-disambig-route">→ cli reference</div>
  </a>
</div>

<div class="vc-divider">
  <div class="vc-divider-rule"></div>
  <div class="vc-divider-shape" style="background-color: var(--vc-yellow);"></div>
  <div class="vc-divider-label">What You Get</div>
  <div class="vc-divider-shape" style="background-color: var(--vc-turquoise); transform: rotate(45deg);"></div>
  <div class="vc-divider-rule"></div>
</div>

<div class="vc-features">
  <div class="vc-feature">
    <div class="vc-feature-title red">Pluggable judges</div>
    <div class="vc-feature-body">Default vibecheck diff, plus exactMatch, fuzzyMatch, and llmJudge. Bring your own by writing a function.</div>
  </div>
  <div class="vc-feature">
    <div class="vc-feature-title cyan">Goldens you can commit</div>
    <div class="vc-feature-body">Storage is project-local at <code>.vibecheck/</code>. Goldens live next to your code; runs and reports stay ephemeral.</div>
  </div>
  <div class="vc-feature">
    <div class="vc-feature-title yellow">Standalone binary</div>
    <div class="vc-feature-body">Built with Bun. Distributed as a ~64MB executable — no Node, no Bun, no node_modules required.</div>
  </div>
  <div class="vc-feature">
    <div class="vc-feature-title pink">Codified changes</div>
    <div class="vc-feature-body">When an eval improves the golden, record it as a structured change with a note. Sweep regressions before saving.</div>
  </div>
</div>

<div class="vc-legalese">
  MIT · No refunds · Diff at your own risk · Goldens subject to change · Bring your own LLM · Not affiliated with Bayındır, Burdur
</div>
