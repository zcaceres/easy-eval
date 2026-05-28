<script setup lang="ts">
import { computed } from "vue";
import { useRoute, useData } from "vitepress";

const route = useRoute();
const { theme, frontmatter } = useData();

const editPath = computed(() => {
  const p = route.path.replace(/\/$/, "");
  if (!p) return "docs/index.md";
  if (route.path.endsWith("/")) return "docs" + p + "/index.md";
  return "docs" + p + ".md";
});
const editHref = computed(() => {
  const pattern = theme.value?.editLink?.pattern ?? "";
  if (typeof pattern === "string") return pattern.replace(":path", editPath.value.replace(/^docs\//, ""));
  return "#";
});
const today = new Date().toISOString().slice(0, 10);
</script>

<template>
  <div v-if="frontmatter.guideProgress" class="vc-progress">
    <div class="label">Progress</div>
    <div class="bars">
      <div
        v-for="n in (frontmatter.guideProgress.total || 5)"
        :key="n"
        class="bar"
        :class="{ on: n <= (frontmatter.guideProgress.step || 1) }"
      />
    </div>
    <div class="meta">
      {{ frontmatter.guideProgress.step || 1 }} of {{ frontmatter.guideProgress.total || 5 }} · scrolling
    </div>
  </div>

  <div v-if="frontmatter.exitLegend" class="vc-legend">
    <div class="head">Exit code legend</div>
    <div class="row ok">0 · pass / ok</div>
    <div class="row bad">1 · regression / io</div>
    <div class="row warn">2 · user abort</div>
  </div>

  <div class="vc-aside-meta">
    <a class="vc-aside-card vc-aside-edit" :href="editHref" target="_blank" rel="noreferrer">
      <span class="vc-aside-card-label">Edit this page</span>
      <span class="vc-aside-card-path">{{ editPath }}</span>
    </a>
    <div class="vc-aside-card vc-aside-updated">
      <span class="vc-aside-card-label">Last updated</span>
      <span class="vc-aside-card-path">{{ today }}</span>
    </div>
  </div>
</template>
