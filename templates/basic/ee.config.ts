import { defineConfig } from "easy-eval";

export default defineConfig({
  workers: {
    default: {
      // Your eval function — takes a dataset ID, returns structured output.
      // Replace this with your actual pipeline logic.
      run: async (ctx) => {
        return {
          title: `Result for ${ctx.datasetId}`,
          score: 0.95,
          items: ["item-a", "item-b"],
        };
      },

      // Optional: define a schema for structured section-by-section diffs.
      // If omitted, easy-eval will auto-diff by comparing JSON recursively.
      //
      // schema: {
      //   sections: [
      //     { path: "title", label: "Title", kind: "scalar" },
      //     { path: "score", label: "Score", kind: "scalar" },
      //     { path: "items", label: "Items", kind: "set" },
      //   ],
      // },
    },
  },
});
