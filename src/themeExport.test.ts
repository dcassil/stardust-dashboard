import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, it, expect } from "vitest";

const packageJsonPath = resolve(process.cwd(), "package.json");
const themeCssPath = resolve(process.cwd(), "src/tokens/theme.css");

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const readPackageJson = (): Record<string, unknown> => {
  const parsed: unknown = JSON.parse(readFileSync(packageJsonPath, "utf8"));
  if (!isRecord(parsed)) {
    throw new Error("package.json must parse to an object");
  }
  return parsed;
};

const getRecord = (
  record: Record<string, unknown>,
  key: string,
): Record<string, unknown> => {
  const value = record[key];
  if (!isRecord(value)) {
    throw new Error(`Expected ${key} to be an object`);
  }
  return value;
};

describe("theme.css packaging contract", () => {
  it("exports the opt-in full theme CSS entry alongside tokens", () => {
    const packageJson = readPackageJson();
    const exportsMap = getRecord(packageJson, "exports");
    const themeExport = getRecord(exportsMap, "./theme.css");
    const tokensExport = getRecord(exportsMap, "./tokens");

    expect(themeExport.import).toBe("./dist/tokens/theme.css");
    expect(tokensExport).toEqual({ import: "./dist/tokens/tokens.css" });
  });

  it("keeps theme.css as a composition layer over tokens.css", () => {
    expect(existsSync(themeCssPath)).toBe(true);

    const themeCss = readFileSync(themeCssPath, "utf8");
    expect(themeCss).toContain('@import "./tokens.css"');
  });
});
