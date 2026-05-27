import { describe, expect, test } from "bun:test";
import { z } from "zod";
import { fromZod } from "./from-zod";

describe("fromZod", () => {
  test("scalar fields become scalar sections", () => {
    const schema = z.object({
      name: z.string(),
      rating: z.number(),
      active: z.boolean(),
    });
    const result = fromZod(schema);
    expect(result.sections).toEqual([
      { path: "name", label: "Name", kind: "scalar" },
      { path: "rating", label: "Rating", kind: "scalar" },
      { path: "active", label: "Active", kind: "scalar" },
    ]);
  });

  test("array of primitives becomes set", () => {
    const schema = z.object({
      tags: z.array(z.string()),
    });
    const result = fromZod(schema);
    expect(result.sections).toEqual([
      { path: "tags", label: "Tags", kind: "set" },
    ]);
  });

  test("array of objects with id field becomes keyed-array", () => {
    const schema = z.object({
      items: z.array(z.object({ id: z.string(), value: z.number() })),
    });
    const result = fromZod(schema);
    expect(result.sections).toEqual([
      { path: "items", label: "Items", kind: "keyed-array", key: "id" },
    ]);
  });

  test("array of objects with name field becomes keyed-array keyed by name", () => {
    const schema = z.object({
      dishes: z.array(z.object({ name: z.string(), sentiment: z.string() })),
    });
    const result = fromZod(schema);
    expect(result.sections).toEqual([
      { path: "dishes", label: "Dishes", kind: "keyed-array", key: "name" },
    ]);
  });

  test("array of objects with no key candidate becomes set", () => {
    const schema = z.object({
      points: z.array(z.object({ x: z.number(), y: z.number() })),
    });
    const result = fromZod(schema);
    expect(result.sections).toEqual([
      { path: "points", label: "Points", kind: "set" },
    ]);
  });

  test("enum and literal become scalar", () => {
    const schema = z.object({
      status: z.enum(["active", "inactive"]),
      version: z.literal("v1"),
    });
    const result = fromZod(schema);
    expect(result.sections).toEqual([
      { path: "status", label: "Status", kind: "scalar" },
      { path: "version", label: "Version", kind: "scalar" },
    ]);
  });

  test("optional and nullable are unwrapped", () => {
    const schema = z.object({
      name: z.string().optional(),
      score: z.number().nullable(),
      tags: z.array(z.string()).optional(),
    });
    const result = fromZod(schema);
    expect(result.sections).toEqual([
      { path: "name", label: "Name", kind: "scalar" },
      { path: "score", label: "Score", kind: "scalar" },
      { path: "tags", label: "Tags", kind: "set" },
    ]);
  });

  test("nested object becomes scalar", () => {
    const schema = z.object({
      sentiment: z.object({ positive: z.number(), negative: z.number() }),
    });
    const result = fromZod(schema);
    expect(result.sections).toEqual([
      { path: "sentiment", label: "Sentiment", kind: "scalar" },
    ]);
  });

  test("override label", () => {
    const schema = z.object({ cuisineType: z.string() });
    const result = fromZod(schema, { cuisineType: { label: "Cuisine" } });
    expect(result.sections).toEqual([
      { path: "cuisineType", label: "Cuisine", kind: "scalar" },
    ]);
  });

  test("override kind", () => {
    const schema = z.object({
      steps: z.array(z.string()),
    });
    const result = fromZod(schema, { steps: { kind: "ordered-array" } });
    expect(result.sections).toEqual([
      { path: "steps", label: "Steps", kind: "ordered-array" },
    ]);
  });

  test("override key on keyed-array", () => {
    const schema = z.object({
      items: z.array(z.object({ sku: z.string(), qty: z.number() })),
    });
    const result = fromZod(schema, { items: { key: "sku" } });
    expect(result.sections).toEqual([
      { path: "items", label: "Items", kind: "keyed-array", key: "sku" },
    ]);
  });

  test("override with display function", () => {
    const schema = z.object({
      dishes: z.array(z.object({ name: z.string(), sentiment: z.string() })),
    });
    const display = (item: any) => `${item.name} (${item.sentiment})`;
    const result = fromZod(schema, { dishes: { display } });
    expect(result.sections[0]!.kind).toBe("keyed-array");
    expect((result.sections[0] as any).display).toBe(display);
  });

  test("exclude a field with false", () => {
    const schema = z.object({
      name: z.string(),
      internal: z.string(),
    });
    const result = fromZod(schema, { internal: false });
    expect(result.sections).toEqual([
      { path: "name", label: "Name", kind: "scalar" },
    ]);
  });

  test("humanizes camelCase field names", () => {
    const schema = z.object({ priceRange: z.string() });
    const result = fromZod(schema);
    expect(result.sections[0]!.label).toBe("Price Range");
  });

  test("throws on non-object schema", () => {
    expect(() => fromZod(z.string() as any)).toThrow();
  });

  test("restaurant example matches manual schema shape", () => {
    const schema = z.object({
      name: z.string(),
      cuisineType: z.string(),
      priceRange: z.enum(["budget", "moderate", "upscale", "fine-dining"]),
      overallRating: z.number(),
      dishes: z.array(z.object({ name: z.string(), sentiment: z.string() })),
      attributes: z.array(z.string()),
      pricePoints: z.array(z.object({ item: z.string(), price: z.string() })),
      highlights: z.array(z.string()),
      warnings: z.array(z.string()),
    });

    const result = fromZod(schema, {
      dishes: { display: (d: any) => `${d.name} (${d.sentiment})` },
      pricePoints: { key: "item", display: (d: any) => `${d.item}: ${d.price}` },
    });

    expect(result.sections.map((s) => ({ path: s.path, kind: s.kind }))).toEqual([
      { path: "name", kind: "scalar" },
      { path: "cuisineType", kind: "scalar" },
      { path: "priceRange", kind: "scalar" },
      { path: "overallRating", kind: "scalar" },
      { path: "dishes", kind: "keyed-array" },
      { path: "attributes", kind: "set" },
      { path: "pricePoints", kind: "keyed-array" },
      { path: "highlights", kind: "set" },
      { path: "warnings", kind: "set" },
    ]);
  });
});
