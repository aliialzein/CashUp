import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "@jest/globals";

/** Every .ts/.tsx file under a folder. */
function sourceFiles(folder: string): string[] {
    return readdirSync(folder, { withFileTypes: true }).flatMap((entry) => {
        const path = join(folder, entry.name);
        if (entry.isDirectory()) return sourceFiles(path);
        return /\.tsx?$/.test(entry.name) ? [path] : [];
    });
}

// The mock gateway's behavior is tested in mockCashOutWrites.test.ts.
describe("the cash-outs service boundary", () => {
    it("is imported by realCashOutWrites.ts only (outside the backend itself)", () => {
        const sourceRoot = join(process.cwd(), "src");
        const importers = sourceFiles(sourceRoot)
            .filter((path) => !relative(sourceRoot, path).startsWith("modules"))
            .filter((path) => readFileSync(path, "utf8").includes("modules/cash-outs/cash-outs.service"))
            .map((path) => relative(sourceRoot, path));

        expect(importers).toEqual([join("lib", "driver", "cash-out", "realCashOutWrites.ts")]);
    });
});
