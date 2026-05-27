import { defineConfig, vibecheck, exactMatch, fuzzyMatch } from "easy-eval";

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

      // Judge determines pass/fail. Omit to use vibecheck() by default.
      //
      // Built-in judges:
      //   vibecheck()    — diffs output against golden (auto-diff or with schema)
      //   exactMatch()   — deep equality check (optionally restrict to specific fields)
      //   fuzzyMatch()   — normalized comparison (case, whitespace, numeric tolerance, Levenshtein)
      //
      // Examples:
      //
      // judge: vibecheck({
      //   schema: {
      //     sections: [
      //       { path: "title", label: "Title", kind: "scalar" },
      //       { path: "score", label: "Score", kind: "scalar" },
      //       { path: "items", label: "Items", kind: "set" },
      //     ],
      //   },
      // }),
      //
      // judge: exactMatch({ fields: ["title", "score"] }),
      //
      // judge: fuzzyMatch({ numericTolerance: 0.1, minSimilarity: 0.9 }),
    },
  },
});
