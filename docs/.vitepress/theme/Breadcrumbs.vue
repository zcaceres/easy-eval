<script setup lang="ts">
import { computed } from "vue";
import { useRoute, useData } from "vitepress";

const route = useRoute();
const { frontmatter } = useData();

const crumbs = computed(() => {
  if (frontmatter.value?.layout === "home" || frontmatter.value?.layout === "page") return [];
  const path = route.path.replace(/^\/|\/$/g, "");
  if (!path) return [];
  const parts = path.split("/").filter(Boolean);
  return parts.map((p, i) => ({
    label: p.replace(/-/g, " "),
    href: "/" + parts.slice(0, i + 1).join("/"),
    last: i === parts.length - 1,
  }));
});
</script>

<template>
  <nav v-if="crumbs.length" class="vc-breadcrumbs" aria-label="Breadcrumb">
    <template v-for="(c, i) in crumbs" :key="c.href">
      <span v-if="i > 0" class="vc-breadcrumbs-sep">→</span>
      <a v-if="!c.last" class="vc-breadcrumbs-link" :href="c.href">{{ c.label }}</a>
      <span v-else class="vc-breadcrumbs-current">{{ c.label }}</span>
    </template>
  </nav>
</template>
