import { join } from "path";
import { existsSync } from "fs";
import { writeFile, mkdir, readFile } from "fs/promises";
import { bold, dim, green } from "../render/colors";

export async function cmdInit(cwd: string = process.cwd()): Promise<void> {
  const configPath = join(cwd, "vibecheck.config.ts");

  if (existsSync(configPath)) {
    console.error("vibecheck.config.ts already exists in this directory.\n");
    console.error("To configure your eval, edit " + bold("vibecheck.config.ts") + ":");
    console.error(dim("  - Define your eval() function to produce structured output"));
    console.error(dim("  - Add a judge (e.g. vibecheck()) to control how evals are scored"));
    console.error("");
    console.error("Then run:");
    console.error(dim("  vibecheck eval <datasetId>    Run eval and compare against golden"));
    console.error(dim("  vibecheck bless <datasetId>   Promote output to golden reference"));
    console.error("");
    console.error("A " + bold("datasetId") + " is a unique string that identifies one input payload");
    console.error("(e.g. \"user-123\", \"invoice-march\", \"edge-case-empty\"). Your eval() function");
    console.error("receives it via ctx.datasetId so it can load the right input data.");
    process.exit(1);
  }

  const templatePath = join(import.meta.dir, "../../templates/basic/vibecheck.config.ts");
  let template: string;
  try {
    template = await readFile(templatePath, "utf-8");
  } catch {
    template = DEFAULT_TEMPLATE;
  }

  await writeFile(configPath, template);
  console.log(green("Created vibecheck.config.ts"));

  const eeDir = join(cwd, ".vibecheck");
  if (!existsSync(eeDir)) {
    await mkdir(eeDir, { recursive: true });
    await writeFile(join(eeDir, ".gitkeep"), "");
    console.log(green("Created .vibecheck/ directory"));
  }

  const gitignorePath = join(cwd, ".gitignore");
  if (existsSync(gitignorePath)) {
    const content = await readFile(gitignorePath, "utf-8");
    if (!content.includes(".vibecheck/")) {
      await writeFile(gitignorePath, content.trimEnd() + "\n\n# vibecheck runs (goldens can be committed separately)\n.vibecheck/*/runs/\n.vibecheck/*/reports/\n");
      console.log(green("Updated .gitignore"));
    }
  }

  const claudeMdPath = join(cwd, "CLAUDE.md");
  if (existsSync(claudeMdPath)) {
    const existing = await readFile(claudeMdPath, "utf-8");
    if (!existing.includes("<!-- vibecheck:begin -->")) {
      await writeFile(claudeMdPath, existing.trimEnd() + "\n\n" + CLAUDE_MD_VIBECHECK_SECTION);
      console.log(green("Updated CLAUDE.md") + dim(" (appended vibecheck usage)"));
    } else {
      console.log(dim("CLAUDE.md already has vibecheck section — skipping"));
    }
  } else {
    await writeFile(claudeMdPath, CLAUDE_MD_VIBECHECK_SECTION);
    console.log(green("Created CLAUDE.md") + dim(" (vibecheck usage instructions)"));
  }

  console.log(bold("\nNext steps:"));
  console.log("");
  console.log("  1. Open " + bold("vibecheck.config.ts") + " and define your " + bold("eval()") + " function");
  console.log("     This is the eval function that produces structured output for a given dataset.");
  console.log("");
  console.log("  2. Optionally add a " + bold("judge") + " to control how evals are scored");
  console.log("     Default is vibecheck() — diffs output against golden (auto-diff or with a schema).");
  console.log("     Pass a schema to vibecheck() for clean section-by-section diffs.");
  console.log("");
  console.log("  3. Run your first eval:");
  console.log(dim("     vibecheck eval <datasetId>    Run eval and compare against golden"));
  console.log(dim("     vibecheck bless <datasetId>   Promote output to golden reference"));
  console.log("");
  console.log("  A " + bold("datasetId") + " is a unique string that identifies one input payload");
  console.log("  (e.g. \"user-123\", \"invoice-march\", \"edge-case-empty\"). Your eval() function");
  console.log("  receives it via ctx.datasetId so it can load the right input data.");
}

const CLAUDE_MD_VIBECHECK_SECTION = `<!-- vibecheck:begin -->
## Eval Workflow (vibecheck)

This project uses \`vibecheck\` for evaluating structured LLM outputs against golden datasets.

### Commands

\`\`\`
vibecheck eval <datasetId>                Run eval, compare against golden
vibecheck eval <datasetId> --no-diff      Run eval without interactive diff prompt
vibecheck bless <datasetId>               Promote output to golden reference
vibecheck runs <datasetId>                List past eval runs
vibecheck report <datasetId> [timestamp]  Show diff report
vibecheck status                          Overview of all datasets and goldens
vibecheck validate                        Validate vibecheck.config.ts
vibecheck changes list                    List codified changes
vibecheck changes export                  Export changes as markdown
\`\`\`

### Key Concepts

- **datasetId**: unique string identifying one test case (e.g. "user-123")
- **Golden**: blessed reference output for comparison
- **Worker**: named eval target, defaults to "default" (use -w to specify)
- **Variables**: \`-v key=value\` to parameterize eval runs (access via \`ctx.vars\`)
- **Regression sweep**: when codifying a change, \`vibecheck eval\` offers to re-run with the same variables across all golden datasets to check for regressions before saving

### Non-Interactive Workflow

Use \`--no-diff\` with \`vibecheck eval\` to skip the interactive "Codify this change?" prompt.
Avoid \`vibecheck merge\` — it requires interactive stdin.

\`\`\`
vibecheck validate                         # verify config
vibecheck bless <datasetId>                # establish golden (first time)
vibecheck eval <datasetId> --no-diff       # run eval
vibecheck report <datasetId>               # view diff
vibecheck bless <datasetId>                # promote if better
\`\`\`

### Storage

- Goldens: \`.vibecheck/{worker}/{datasetId}/golden.json\`
- Runs: \`.vibecheck/{worker}/{datasetId}/runs/{timestamp}.json\`
- Config: \`vibecheck.config.ts\`
<!-- vibecheck:end -->
`;

const DEFAULT_TEMPLATE = `import { defineConfig, vibecheck, exactMatch, fuzzyMatch, llmJudge } from "vibecheck";

export default defineConfig({
  evals: {
    default: {
      // Your eval function — takes a dataset ID, returns structured output.
      // Replace this with your actual pipeline logic.
      //
      // Use ctx.vars to read CLI variables passed via -v key=value:
      //   vibecheck eval my-dataset -v model=gpt-4o -v prompt="be concise"
      eval: async (ctx) => {
        // const model = ctx.vars.model ?? "gpt-4o";
        // const prompt = ctx.vars.prompt ?? "default prompt";
        return {
          title: \`Result for \${ctx.datasetId}\`,
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
      //   llmJudge()     — LLM-as-judge (you provide the LLM call function + optional rubric)
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
      //
      // judge: llmJudge({
      //   call: async (prompt) => await myLlm(prompt),
      //   rubric: "Check that all fields are present and accurate",
      // }),
    },
  },
});
`;
