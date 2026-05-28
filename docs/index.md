---
layout: page
title: easy-eval
---

<div class="ee-hero">
  <div class="ee-hero-mark"></div>
  <div class="ee-hero-stack">
    <div class="ee-hero-title">easy-eval</div>
    <div class="ee-hero-tag">A CLI for evaluating structured LLM outputs against goldens.</div>
  </div>
  <div class="ee-hero-chip">v0.1.0</div>
</div>

<div class="ee-disambig-header">
  <div class="ee-disambig-header-dot"></div>
  <div class="ee-disambig-header-text">ee — may refer to:</div>
</div>

<div class="ee-disambig">
  <a class="ee-disambig-row" href="/guide/getting-started">
    <div class="ee-shape ee-shape-dot-red"></div>
    <div class="ee-disambig-intent">Run my first eval</div>
    <div class="ee-disambig-route">→ getting started</div>
  </a>
  <a class="ee-disambig-row" href="/guide/sweep">
    <div class="ee-shape ee-shape-diamond-cyan"></div>
    <div class="ee-disambig-intent">Debug a regression across datasets</div>
    <div class="ee-disambig-route">→ regression sweep</div>
  </a>
  <a class="ee-disambig-row" href="/guide/judges">
    <div class="ee-shape ee-shape-square-yellow"></div>
    <div class="ee-disambig-intent">Write a custom judge for my domain</div>
    <div class="ee-disambig-route">→ judges</div>
  </a>
  <a class="ee-disambig-row" href="/api/">
    <div class="ee-shape ee-shape-dot-pink"></div>
    <div class="ee-disambig-intent">Integrate ee into my pipeline programmatically</div>
    <div class="ee-disambig-route">→ api reference</div>
  </a>
  <a class="ee-disambig-row" href="/cli">
    <div class="ee-shape ee-shape-square-ochre"></div>
    <div class="ee-disambig-intent">Look up a CLI command</div>
    <div class="ee-disambig-route">→ cli reference</div>
  </a>
</div>

<div class="ee-divider">
  <div class="ee-divider-rule"></div>
  <div class="ee-divider-shape" style="background-color: var(--ee-yellow);"></div>
  <div class="ee-divider-label">What You Get</div>
  <div class="ee-divider-shape" style="background-color: var(--ee-turquoise); transform: rotate(45deg);"></div>
  <div class="ee-divider-rule"></div>
</div>

<div class="ee-features">
  <div class="ee-feature">
    <div class="ee-feature-title red">Pluggable judges</div>
    <div class="ee-feature-body">Default vibecheck diff, plus exactMatch, fuzzyMatch, and llmJudge. Bring your own by writing a function.</div>
  </div>
  <div class="ee-feature">
    <div class="ee-feature-title cyan">Goldens you can commit</div>
    <div class="ee-feature-body">Storage is project-local at <code>.ee/</code>. Goldens live next to your code; runs and reports stay ephemeral.</div>
  </div>
  <div class="ee-feature">
    <div class="ee-feature-title yellow">Standalone binary</div>
    <div class="ee-feature-body">Built with Bun. Distributed as a ~64MB executable — no Node, no Bun, no node_modules required.</div>
  </div>
  <div class="ee-feature">
    <div class="ee-feature-title pink">Codified changes</div>
    <div class="ee-feature-body">When an eval improves the golden, record it as a structured change with a note. Sweep regressions before saving.</div>
  </div>
</div>

<div class="ee-legalese">
  MIT · No refunds · Diff at your own risk · Goldens subject to change · Bring your own LLM · Not affiliated with Bayındır, Burdur
</div>
