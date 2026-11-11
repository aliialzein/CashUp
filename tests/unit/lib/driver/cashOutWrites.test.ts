import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "@jest/globals";
import { mockCashOutWrites } from "@/lib/driver/cash-out/mockCashOutWrites";

/** Every .ts/.tsx file under a folder. */
function sourceFiles(folder: string): string[] {
    return readdirSync(folder, { withFileTypes: true }).flatMap((entry) => {
        const path = join(folder, entry.name);
        if (entry.isDirectory()) return sourceFiles(path);
        return /\.tsx?$/.test(entry.name) ? [path] : [];
    });
}

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

describe("mockCashOutWrites", () => {
    it("answers ok and stores nothing, as decided for mock mode", async () => {
        const details = { amount: { usd: "5.00", lbp: "0.00" }, reason: "Fuel", note: null };

        await expect(mockCashOutWrites.addCashOut(details, "4f0c7b1e-8a2d-4c6e-9b3f-2d1a5e7c9b0a")).resolves.toEqual({ ok: true });
        await expect(mockCashOutWrites.cancelCashOut("co-1", "Typed twice")).resolves.toEqual({ ok: true });
    });
});
