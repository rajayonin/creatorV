/**
 * Deno doesn't fully support "sloppy imports"
 * (https://docs.deno.com/runtime/reference/cli/unstable_flags/#--unstable-sloppy-imports),
 * which would make our lives easier by just writting in a `foo.ts` file:
 * ```ts
 * import { architecture, status } from "@/core/core";
 * ```
 *
 * Therefore, this file is currently used to annotate using JSDoc (using @type
 * {import("./core.d.ts").Stuff})
 *  */

type RegisterBank = {
    name: string;
    type: string;
    double_precision: boolean;
    elements: Register[];
};

type Register = {
    name: string[];
    nbits: number;
    value: bigint;
    default_value: bigint;
    properties: string[];
};

type InstructionField = {
    name: string;
    value: string;
    type: string;
    startbit: number;
    stopbit: number;
    order: number;
    word: number[];
    enum_name?: string;
};

type PseudoInstructionField = {
    name: string;
    type: string;
    enum_name?: string;
};

type Instruction = {
    name: string;
    co: string;
    template: string;
    description: string;
    type: string;
    signature_definition: string;
    nwords: number;
    clk_cycles: number;
    fields: InstructionField[];
    definition: string;
    properties?: string[];
    help?: string;
};

type PseudoInstruction = {
    name: string;
    description: string;
    signature_definition: string;
    fields: PseudoInstructionField[];
    definition: string;
    properties?: string[];
    help?: string;
};

type MemoryLayout = {
    ktext?: { start: number; end: number };
    kdata?: { start: number; end: number };
    text: { start: number; end: number };
    data: { start: number; end: number };
    stack: { start: number; end: number };
};

type Directive = { name: string; action: string };

export declare const REGISTERS: RegisterBank[];

type Architecture = {
    config: {
        name: string;
        wordSize: number;
        description: string;
        endianness: string;
        memory_alignment: string;
        main_function: string;
        passing_convention: boolean;
        comment_prefix: string;
        start_address: number;
        pc_offset: number;
        byte_size: number;
        plugin: string;
        assemblers: {
            name: string;
            description: string;
        }[];
    };
    memory_layout: MemoryLayout;
    components: RegisterBank[];
    instructions: Instruction[];
    pseudoinstructions: PseudoInstruction[];
    directives: Directive[];
    interrupts: {
        enabled: boolean;
        enable: string;
        disable: string;
        check: string;
        clear: string;
        get_handler_addr: string;
        create: string;
    };
    timer: {
        tick_cycles: number;
        advance: string;
        handler: string;
        is_enabled: string;
        enable: string;
        disable: string;
    };
};
export declare const architecture: Architecture;

import type { ExecutionMode } from "./executor/interrupts.mts";

type Status = {
    execution_init: number;
    executedInstructions: number;
    clkCycles: number;
    run_program: number;

    keyboard: string;
    display: string;
    execution_index: number;
    virtual_PC: bigint;
    error: boolean;
    execution_mode: ExecutionMode;
    interrupts_enabled: boolean;
};
export declare const status: Status;

type GUIVariables = {
    previous_PC: bigint;
    keep_highlighted: bigint;
};

export declare const guiVariables: GUIVariables;

import type { Memory } from "./memory/Memory.mts";
export declare const main_memory: Memory;
export declare const main_memory_backup: Memory;

import type { StackTracker } from "./memory/StackTracker.mts";
export declare const stackTracker: StackTracker;

export declare const BYTESIZE: number;
export declare const WORDSIZE: number;

type LibraryInstruction = {
    Break: null | boolean;
    Address: string;
    Label: string;
    loaded: string;
    user: string | null;
    _rowVariant: string;
    visible: boolean;
    globl: boolean;
};

type LibraryTag = {
    tag: string;
    addr: number;
    globl: boolean;
};

type Library = {
    instuctions_binary: LibraryInstruction[];
    instructions_tag: LibraryTag[];
};

export declare const update_binary: Library;
