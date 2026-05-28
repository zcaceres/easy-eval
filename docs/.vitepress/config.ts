import { defineConfig } from "vitepress";

export default defineConfig({
  base: "/",
  title: "vibecheck",
  description: "CLI toolkit for evaluating structured LLM outputs against golden datasets",
  cleanUrls: true,
  appearance: "dark",
  head: [
    ["meta", { property: "og:type", content: "website" }],
    ["meta", { property: "og:title", content: "vibecheck" }],
    [
      "meta",
      {
        property: "og:description",
        content: "Evaluate structured LLM outputs against golden datasets",
      },
    ],
  ],
  themeConfig: {
    nav: [
      { text: "Guide", link: "/guide/getting-started" },
      { text: "Judges", link: "/guide/judges" },
      { text: "CLI", link: "/cli" },
      { text: "API", link: "/api/" },
    ],
    sidebar: [
      {
        text: "Guide",
        collapsed: false,
        items: [
          { text: "Getting Started", link: "/guide/getting-started" },
          { text: "Core Concepts", link: "/guide/concepts" },
          { text: "Regression Sweep", link: "/guide/sweep" },
        ],
      },
      {
        text: "Judges",
        collapsed: false,
        items: [
          { text: "Overview", link: "/guide/judges" },
          { text: "vibecheck", link: "/guide/judges#vibecheck" },
          { text: "exactMatch", link: "/guide/judges#exactmatch" },
          { text: "fuzzyMatch", link: "/guide/judges#fuzzymatch" },
          { text: "llmJudge", link: "/guide/judges#llmjudge" },
          { text: "Custom judges", link: "/guide/judges#writing-a-custom-judge" },
        ],
      },
      {
        text: "CLI",
        collapsed: false,
        items: [{ text: "Commands", link: "/cli" }],
      },
      {
        text: "API",
        collapsed: false,
        items: [
          { text: "Overview", link: "/api/" },
          { text: "All Exports", link: "/api/README" },
        ],
      },
    ],
    socialLinks: [{ icon: "github", link: "https://github.com/zcaceres/vibecheck" }],
    footer: {
      message: "MIT · BUILT WITH BUN + VITEPRESS · NOT AFFILIATED WITH BAYINDIR, BURDUR",
      copyright: "github.com/zcaceres/vibecheck · v0.1.0",
    },
    search: {
      provider: "local",
    },
    editLink: {
      pattern: "https://github.com/zcaceres/vibecheck/edit/main/docs/:path",
      text: "Edit this page",
    },
    lastUpdated: {
      text: "Last updated",
      formatOptions: { dateStyle: "short", timeStyle: undefined },
    },
  },
  lastUpdated: true,
});
