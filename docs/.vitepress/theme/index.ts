import DefaultTheme from "vitepress/theme";
import { h } from "vue";
import Breadcrumbs from "./Breadcrumbs.vue";
import AsideMeta from "./AsideMeta.vue";
import "./custom.css";

export default {
  extends: DefaultTheme,
  Layout: () =>
    h(DefaultTheme.Layout, null, {
      "doc-before": () => h(Breadcrumbs),
      "aside-outline-after": () => h(AsideMeta),
    }),
};
