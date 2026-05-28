import { join } from "path";
import { existsSync } from "fs";
import { writeFile, mkdir, readFile } from "fs/promises";
import { bold, dim, green } from "../render/colors";

export async function cmdInit(cwd: string = process.cwd()): Promise<void> {
  const configPath = join(cwd, "ee.config.ts");

  if (existsSync(configPath)) {
    console.error("ee.config.ts already exists in this directory.\n");
    console.error("To configure your eval, edit " + bold("ee.config.ts") + ":");
    console.error(dim("  - Define your eval() function to produce structured output"));
    console.error(dim("  - Add a judge (e.g. vibecheck()) to control how evals are scored"));
    console.error("");
    console.error("Then run:");
    console.error(dim("  ee eval <datasetId>    Run eval and compare against golden"));
    console.error(dim("  ee bless <datasetId>   Promote output to golden reference"));
    console.error("");
    console.error("A " + bold("datasetId") + " is a unique string that identifies one input payload");
    console.error("(e.g. \"user-123\", \"invoice-march\", \"edge-case-empty\"). Your eval() function");
    console.error("receives it via ctx.datasetId so it can load the right input data.");
    process.exit(1);
  }

  const templatePath = join(import.meta.dir, "../../templates/basic/ee.config.ts");
  let template: string;
  try {
    template = await readFile(templatePath, "utf-8");
  } catch {
    template = DEFAULT_TEMPLATE;
  }

  await writeFile(configPath, template);
  console.log(green("Created ee.config.ts"));

  const eeDir = join(cwd, ".ee");
  if (!existsSync(eeDir)) {
    await mkdir(eeDir, { recursive: true });
    await writeFile(join(eeDir, ".gitkeep"), "");
    console.log(green("Created .ee/ directory"));
  }

  const gitignorePath = join(cwd, ".gitignore");
  if (existsSync(gitignorePath)) {
    const content = await readFile(gitignorePath, "utf-8");
    if (!content.includes(".ee/")) {
      await writeFile(gitignorePath, content.trimEnd() + "\n\n# easy-eval runs (goldens can be committed separately)\n.ee/*/runs/\n.ee/*/reports/\n");
      console.log(green("Updated .gitignore"));
    }
  }

  const claudeMdPath = join(cwd, "CLAUDE.md");
  if (existsSync(claudeMdPath)) {
    const existing = await readFile(claudeMdPath, "utf-8");
    if (!existing.includes("<!-- ee:begin -->")) {
      await writeFile(claudeMdPath, existing.trimEnd() + "\n\n" + CLAUDE_MD_EE_SECTION);
      console.log(green("Updated CLAUDE.md") + dim(" (appended ee usage)"));
    } else {
      console.log(dim("CLAUDE.md already has ee section — skipping"));
    }
  } else {
    await writeFile(claudeMdPath, CLAUDE_MD_EE_SECTION);
    console.log(green("Created CLAUDE.md") + dim(" (ee usage instructions)"));
  }

  console.log(bold("\nNext steps:"));
  console.log("");
  console.log("  1. Open " + bold("ee.config.ts") + " and define your " + bold("eval()") + " function");
  console.log("     This is the eval function that produces structured output for a given dataset.");
  console.log("");
  console.log("  2. Optionally add a " + bold("judge") + " to control how evals are scored");
  console.log("     Default is vibecheck() — diffs output against golden (auto-diff or with a schema).");
  console.log("     Pass a schema to vibecheck() for clean section-by-section diffs.");
  console.log("");
  console.log("  3. Run your first eval:");
  console.log(dim("     ee eval <datasetId>    Run eval and compare against golden"));
  console.log(dim("     ee bless <datasetId>   Promote output to golden reference"));
  console.log("");
  console.log("  A " + bold("datasetId") + " is a unique string that identifies one input payload");
  console.log("  (e.g. \"user-123\", \"invoice-march\", \"edge-case-empty\"). Your eval() function");
  console.log("  receives it via ctx.datasetId so it can load the right input data.");
}

const CLAUDE_MD_EE_SECTION = `<!-- ee:begin -->
## Eval Workflow (ee)

This project uses \`ee\` (easy-eval) for evaluating structured LLM outputs against golden datasets.

### Commands

\`\`\`
ee eval <datasetId>                Run eval, compare against golden
ee eval <datasetId> --no-diff      Run eval without interactive diff prompt
ee bless <datasetId>               Promote output to golden reference
ee runs <datasetId>                List past eval runs
ee report <datasetId> [timestamp]  Show diff report
ee status                          Overview of all datasets and goldens
ee validate                        Validate ee.config.ts
ee changes list                    List codified changes
ee changes export                  Export changes as markdown
\`\`\`

### Key Concepts

- **datasetId**: unique string identifying one test case (e.g. "user-123")
- **Golden**: blessed reference output for comparison
- **Worker**: named eval target, defaults to "default" (use -w to specify)
- **Variables**: \`-v key=value\` to parameterize eval runs (access via \`ctx.vars\`)
- **Regression sweep**: when codifying a change, \`ee eval\` offers to re-run with the same variables across all golden datasets to check for regressions before saving

### Non-Interactive Workflow

Use \`--no-diff\` with \`ee eval\` to skip the interactive "Codify this change?" prompt.
Avoid \`ee merge\` — it requires interactive stdin.

\`\`\`
ee validate                         # verify config
ee bless <datasetId>                # establish golden (first time)
ee eval <datasetId> --no-diff       # run eval
ee report <datasetId>               # view diff
ee bless <datasetId>                # promote if better
\`\`\`

### Storage

- Goldens: \`.ee/{worker}/{datasetId}/golden.json\`
- Runs: \`.ee/{worker}/{datasetId}/runs/{timestamp}.json\`
- Config: \`ee.config.ts\`
<!-- ee:end -->
`;

const DEFAULT_TEMPLATE = `import { defineConfig, vibecheck } from "easy-eval";

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
          title: \`Result for \${ctx.datasetId}\`,
          score: 0.95,
          items: ["item-a", "item-b"],
        };
      },

      // Judge determines pass/fail. vibecheck() diffs output against golden.
      // Omit to use vibecheck() with auto-diff by default.
      // Pass a schema for structured section-by-section diffs:
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
    },
  },
});
`;
