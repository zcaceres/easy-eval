<script setup lang="ts">
import { computed } from "vue";
import { useRoute, useData } from "vitepress";

const route = useRoute();
const { frontmatter } = useData();

const LABELS: Record<string, string> = {
  "": "DOCS",
  "guide": "GUIDE",
  "api": "API",
  "cli": "CLI",
  "getting-started": "GETTING STARTED",
  "concepts": "CORE CONCEPTS",
  "sweep": "REGRESSION SWEEP",
  "judges": "JUDGES",
};

const crumbs = computed(() => {
  if (frontmatter.value?.hideBreadcrumbs) return [];
  const path = route.path.replace(/^\/|\/$/g, "");
  const root = { label: "DOCS", href: "/", last: false };
  if (!path) return [root, { label: "INTRODUCTION", href: "/", last: true }];
  const parts = path.split("/").filter(Boolean);
  const tail = parts.map((p, i) => ({
    label: LABELS[p] ?? p.replace(/-/g, " ").toUpperCase(),
    href: "/" + parts.slice(0, i + 1).join("/"),
    last: i === parts.length - 1,
  }));
  return [root, ...tail];
});
</script>

<template>
  <nav v-if="crumbs.length" class="vc-breadcrumbs" aria-label="Breadcrumb">
    <template v-for="(c, i) in crumbs" :key="c.href">
      <span v-if="i > 0" class="vc-breadcrumbs-sep">→</span>
      <a v-if="!c.last" :href="c.href">{{ c.label }}</a>
      <span v-else class="vc-breadcrumbs-current">{{ c.label }}</span>
    </template>
  </nav>
</template>
