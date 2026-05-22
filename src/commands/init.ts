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
    console.error(dim("  - Add a diffSchema for section-by-section diffs (optional)"));
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

  console.log(bold("\nNext steps:"));
  console.log("");
  console.log("  1. Open " + bold("ee.config.ts") + " and define your " + bold("eval()") + " function");
  console.log("     This is the eval function that produces structured output for a given dataset.");
  console.log("");
  console.log("  2. Optionally add a " + bold("diffSchema") + " to control how diffs are displayed");
  console.log("     Without a diffSchema, easy-eval auto-diffs JSON recursively.");
  console.log("     With a diffSchema, you get clean section-by-section diffs (scalar, keyed-array, set).");
  console.log("");
  console.log("  3. Run your first eval:");
  console.log(dim("     ee eval <datasetId>    Run eval and compare against golden"));
  console.log(dim("     ee bless <datasetId>   Promote output to golden reference"));
  console.log("");
  console.log("  A " + bold("datasetId") + " is a unique string that identifies one input payload");
  console.log("  (e.g. \"user-123\", \"invoice-march\", \"edge-case-empty\"). Your eval() function");
  console.log("  receives it via ctx.datasetId so it can load the right input data.");
}

const DEFAULT_TEMPLATE = `import { defineConfig } from "easy-eval";

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
`;
