import { defineConfig } from "easy-eval";

export default defineConfig({
  evals: {
    default: {
      // Your eval function — takes a dataset ID, returns structured output.
      // Replace this with your actual pipeline logic.
      //
      // Use ctx.vars to read CLI variables passed via -v key=value:
      //   ee eval my-dataset -v model=gpt-4o -v prompt="be concise"
      eval: async (ctx) => {
        // const model = ctx.vars.model ?? "gpt-4o";
        // const prompt = ctx.vars.prompt ?? "default prompt";
        return {
          title: `Result for ${ctx.datasetId}`,
          score: 0.95,
          items: ["item-a", "item-b"],
        };
      },

      // Optional: define a diffSchema for structured section-by-section diffs.
      // If omitted, easy-eval will auto-diff by comparing JSON recursively.
      //
      // diffSchema: {
      //   sections: [
      //     { path: "title", label: "Title", kind: "scalar" },
      //     { path: "score", label: "Score", kind: "scalar" },
      //     { path: "items", label: "Items", kind: "set" },
      //   ],
      // },
    },
  },
});
