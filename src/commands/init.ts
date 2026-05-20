import { join } from "path";
import { existsSync } from "fs";
import { writeFile, mkdir, readFile } from "fs/promises";

export async function cmdInit(cwd: string = process.cwd()): Promise<void> {
  const configPath = join(cwd, "ee.config.ts");

  if (existsSync(configPath)) {
    console.error("ee.config.ts already exists in this directory.");
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
  console.log("Created ee.config.ts");

  const eeDir = join(cwd, ".ee");
  if (!existsSync(eeDir)) {
    await mkdir(eeDir, { recursive: true });
    await writeFile(join(eeDir, ".gitkeep"), "");
    console.log("Created .ee/ directory");
  }

  const gitignorePath = join(cwd, ".gitignore");
  if (existsSync(gitignorePath)) {
    const content = await readFile(gitignorePath, "utf-8");
    if (!content.includes(".ee/")) {
      await writeFile(gitignorePath, content.trimEnd() + "\n\n# easy-eval runs (goldens can be committed separately)\n.ee/*/runs/\n.ee/*/reports/\n");
      console.log("Updated .gitignore");
    }
  }

  console.log("\nReady! Edit ee.config.ts to configure your eval, then run:");
  console.log("  ee eval <datasetId>    Run an eval");
  console.log("  ee bless <datasetId>   Bless output as golden");
}

const DEFAULT_TEMPLATE = `import { defineConfig } from "easy-eval";

export default defineConfig({
  workers: {
    default: {
      // Your eval function — takes a dataset ID, returns structured output.
      // Replace this with your actual pipeline logic.
      run: async (ctx) => {
        return {
          title: \`Result for \${ctx.datasetId}\`,
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
`;
