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
  <div class="ee-aside-meta">
    <a class="ee-aside-card ee-aside-edit" :href="editHref" target="_blank" rel="noreferrer">
      <span class="ee-aside-card-label">Edit this page</span>
      <span class="ee-aside-card-path">{{ editPath }}</span>
    </a>
    <div class="ee-aside-card ee-aside-updated">
      <span class="ee-aside-card-label">Last updated</span>
      <span class="ee-aside-card-path">{{ new Date().toISOString().slice(0, 10) }}</span>
    </div>
  </div>
</template>
