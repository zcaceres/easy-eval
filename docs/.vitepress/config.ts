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
      { text: "Docs", link: "/" },
      { text: "Guide", link: "/guide/getting-started" },
      { text: "Judges", link: "/guide/judges" },
      { text: "CLI", link: "/cli" },
      { text: "API", link: "/api/" },
    ],
    sidebar: [
      {
        text: "Docs",
        collapsed: false,
        items: [
          { text: "Introduction", link: "/" },
          { text: "What you get", link: "/#what-you-get" },
          { text: "Quick start", link: "/#quick-start" },
          { text: "Pick your path", link: "/#pick-your-path" },
        ],
      },
      {
        text: "Guide",
        collapsed: false,
        items: [
          { text: "Getting started", link: "/guide/getting-started" },
          { text: "Core concepts", link: "/guide/concepts" },
          { text: "Regression sweep", link: "/guide/sweep" },
        ],
      },
      {
        text: "Judges",
        collapsed: false,
        items: [
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
        items: [
          { text: "Commands", link: "/cli" },
          { text: "Flags & variables", link: "/cli#global-flags" },
          { text: "Exit codes", link: "/cli#exit-codes" },
        ],
      },
      {
        text: "API",
        collapsed: false,
        items: [
          { text: "Overview", link: "/api/" },
          { text: "All exports", link: "/api/README" },
        ],
      },
    ],
    socialLinks: [{ icon: "github", link: "https://github.com/zcaceres/vibecheck" }],
    footer: {
      message: "MIT · BUILT WITH BUN + VITEPRESS · NOT AFFILIATED WITH BAYINDIR, BURDUR",
      copyright: "github.com/zcaceres/vibecheck",
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
