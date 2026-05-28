<script setup lang="ts">
import { computed } from "vue";
import { useRoute, useData } from "vitepress";

const route = useRoute();
const { theme } = useData();

const editPath = computed(() => {
  const md = route.path.replace(/\/$/, "") + (route.path.endsWith("/") ? "index.md" : ".md");
  return md.replace(/^\//, "");
});
const editHref = computed(() => {
  const pattern = theme.value?.editLink?.pattern ?? "";
  if (typeof pattern === "string") return pattern.replace(":path", editPath.value);
  return "#";
});
</script>

<template>
  <div class="vc-aside-meta">
    <a class="vc-aside-card vc-aside-edit" :href="editHref" target="_blank" rel="noreferrer">
      <span class="vc-aside-card-label">Edit this page</span>
      <span class="vc-aside-card-path">{{ editPath }}</span>
    </a>
    <div class="vc-aside-card vc-aside-updated">
      <span class="vc-aside-card-label">Last updated</span>
      <span class="vc-aside-card-path">{{ new Date().toISOString().slice(0, 10) }}</span>
    </div>
  </div>
</template>
