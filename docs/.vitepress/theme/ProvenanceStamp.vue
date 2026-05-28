<script setup lang="ts">
import { computed } from "vue";
import { useData } from "vitepress";

const { frontmatter } = useData();

const DEFAULTS: Record<string, string> = {
  "vc-page-home": "Memphis Lineup — Docset / Home · same family, different stage",
  "vc-page-guide": "Memphis Lineup — Docset / Guide · numbered spine, yellow spine accent",
  "vc-page-cli": "Memphis Lineup — Docset / CLI · teal spine, exit-code legend, terminal hero",
  "vc-page-api": "Memphis Lineup — Docset / API · pink spine, surface counter, import hero",
};

const text = computed(() => {
  const fm = frontmatter.value ?? {};
  if (typeof fm.provenance === "string") return fm.provenance;
  const key = typeof fm.pageClass === "string" ? fm.pageClass : "vc-page-home";
  return DEFAULTS[key] ?? DEFAULTS["vc-page-home"];
});
</script>

<template>
  <div class="vc-stamp">{{ text }}</div>
</template>
