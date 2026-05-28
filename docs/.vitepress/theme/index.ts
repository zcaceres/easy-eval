import DefaultTheme from "vitepress/theme";
import { h, computed, watchEffect } from "vue";
import { useData } from "vitepress";
import Breadcrumbs from "./Breadcrumbs.vue";
import AsideMeta from "./AsideMeta.vue";
import "./custom.css";

export default {
  extends: DefaultTheme,
  Layout: () => {
    const { frontmatter } = useData();
    if (typeof document !== "undefined") {
      watchEffect(() => {
        const cls = (frontmatter.value?.pageClass as string) ?? "vc-page-home";
        const root = document.documentElement;
        root.classList.remove("vc-page-home", "vc-page-guide", "vc-page-cli", "vc-page-api");
        root.classList.add(cls);
      });
    }
    return h(DefaultTheme.Layout, null, {
      "doc-before": () => h(Breadcrumbs),
      "aside-outline-after": () => h(AsideMeta),
    });
  },
};
