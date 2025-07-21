import { newArchitectureLoad } from "../../../../../../src/core/core.mjs";
import fs from "node:fs";
import { assertEquals } from "https://deno.land/std/assert/mod.ts";
import { decode_instruction } from "../../../../../../src/core/executor/decoder.mjs";

export function setupArchitecture(
    architecturePath = "./architecture/RISCV/RV32IMFD.yml",
) {
    const architectureFile = fs.readFileSync(architecturePath, "utf8");
    newArchitectureLoad(architectureFile);
}

export function decode_test(instruction, expected) {
    setupArchitecture();
    const result = decode_instruction(instruction, true, true);

    assertEquals(result, expected);
}
