import fs from "node:fs";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import * as creator from "../core/core.mjs";
import { step } from "../core/executor/executor.mjs";
import { decode_instruction } from "../core/executor/decoder.mjs";
import process from "node:process";
import { logger } from "../core/utils/creator_logger.mjs";
import readline from "node:readline";
import { instructions } from "../core/compiler/compiler.mjs";
import {
    track_stack_getFrames,
    track_stack_getNames,
    track_stack_getAllHints,
} from "../core/memory/stackTracker.mjs";
import { startTutorial } from "./tutorial.mts";
import yaml from "js-yaml";
import path from "node:path";
import { displayHelp } from "./utils.mts";
import { Buffer } from "node:buffer";

const MAX_INSTRUCTIONS = 10000000000;
const CLI_VERSION = "0.1.0";
export let ACCESSIBLE = false;
// Track the address of the previously executed instruction
let PREVIOUS_PC = "0x0";
// Maximum number of states to keep for unstepping (-1 for unlimited, 0 to disable)
let MAX_STATES_TO_KEEP = 0;
// Stack to store previous states for unstepping
let previousStates: string[] = [];
// Whether tutorial mode is active
let TUTORIAL_MODE = false;
// Track if a binary file was loaded
let BINARY_LOADED = false;
// Track if execution is currently paused
let EXECUTION_PAUSED = false;
const creatorASCII = `
 ██████╗██████╗ ███████╗ █████╗ ████████╗ ██████╗ ██████╗ 
██╔════╝██╔══██╗██╔════╝██╔══██╗╚══██╔══╝██╔═══██╗██╔══██╗
██║     ██████╔╝█████╗  ███████║   ██║   ██║   ██║██████╔╝
██║     ██╔══██╗██╔══╝  ██╔══██║   ██║   ██║   ██║██╔══██╗
╚██████╗██║  ██║███████╗██║  ██║   ██║   ╚██████╔╝██║  ██║
 ╚═════╝╚═╝  ╚═╝╚══════╝╚═╝  ╚═╝   ╚═╝    ╚═════╝ ╚═╝  ╚═╝
  didaCtic and geneRic assEmbly progrAmming simulaTOR
`;

interface ArgvOptions {
    architecture: string;
    isa: string[];
    binary: string;
    library: string;
    assembly: string;
    interactive: boolean;
    debug: boolean;
    reference: string;
    state: string;
    accessible: boolean;
    tutorial: boolean;
    config?: string; // Add config file option
    verbose?: boolean; // Add verbose flag option
}

interface ReturnType {
    status?: string;
    msg?: string;
    token?: string;
    errorcode?: string;
    type?: string;
    update?: string;
    error?: boolean;
}
interface ConfigType {
    settings: {
        max_states?: number;
        accessible?: boolean;
        keyboard_shortcuts?: boolean; // Add keyboard shortcuts setting
        auto_list_after_shortcuts?: boolean; // Add auto-list setting
    };
    aliases: {
        [key: string]: string;
    };
    shortcuts: {
        [key: string]: string;
    };
}
// Loaded config
export let CONFIG: ConfigType = { settings: {}, aliases: {}, shortcuts: {} };
// Default config path
const CONFIG_PATH = path.join(
    process.env.HOME || ".",
    ".config",
    "creator",
    "config.yml",
);

// Default configuration
const DEFAULT_CONFIG: ConfigType = {
    settings: {
        max_states: 0,
        accessible: false,
        keyboard_shortcuts: true, // Enable keyboard shortcuts by default
        auto_list_after_shortcuts: true, // Disabled by default
    },
    aliases: {},
    shortcuts: {},
};

// Function to load configuration from YAML file
function loadConfiguration(configPath: string = CONFIG_PATH): ConfigType {
    try {
        // Ensure the directory exists
        const configDir = path.dirname(configPath);
        if (!fs.existsSync(configDir)) {
            fs.mkdirSync(configDir, { recursive: true });
        }

        // Check if config file exists, create default if not
        if (!fs.existsSync(configPath)) {
            fs.writeFileSync(configPath, yaml.dump(DEFAULT_CONFIG), "utf8");
            return DEFAULT_CONFIG;
        }

        // Load and parse the config file
        const configData = fs.readFileSync(configPath, "utf8");
        const config = yaml.load(configData) as ConfigType;

        // Merge with defaults to ensure all fields exist
        return {
            settings: { ...DEFAULT_CONFIG.settings, ...config.settings },
            aliases: { ...DEFAULT_CONFIG.aliases, ...config.aliases },
            shortcuts: { ...DEFAULT_CONFIG.shortcuts, ...config.shortcuts },
        };
    } catch (error) {
        console.error(`Error loading configuration: ${error.message}`);
        return DEFAULT_CONFIG;
    }
}

// Apply configuration settings
function applyConfiguration(config: ConfigType): void {
    if (config.settings.max_states !== undefined) {
        MAX_STATES_TO_KEEP = config.settings.max_states;
    }

    if (config.settings.accessible !== undefined) {
        ACCESSIBLE = config.settings.accessible;
    }

    // If keyboard_shortcuts is undefined, leave the default (true)
    // This maintains backward compatibility with older config files
}

// Helper function to determine if a command should auto-list after execution
function shouldAutoListAfterCommand(cmd: string): boolean {
    // Commands that already provide visual output or don't modify program state
    const noAutoListCommands = [
        "list",
        "help",
        "reg",
        "mem",
        "hexview",
        "stack",
        "snapshot",
        "save",
        "alias",
        "about",
        "clear",
        "pause",
        "run",
    ];

    return !noAutoListCommands.includes(cmd);
}

// Process command with potential alias substitution
function applyAlias(
    cmd: string,
    args: string[],
): { cmd: string; args: string[] } {
    // Check if the command has an alias
    const alias = CONFIG.aliases[cmd];
    if (!alias) {
        return { cmd, args };
    }

    // Parse the alias into command and args
    const aliasTokens = alias.trim().split(/\s+/);
    const aliasCmd = aliasTokens[0];

    // Combine alias args with original args (skipping the original command)
    const aliasArgs = aliasTokens.concat(args.slice(1));

    return { cmd: aliasCmd, args: aliasArgs };
}

function clearConsole() {
    console.clear();
}

function colorText(text: string, colorCode: string): string {
    return !ACCESSIBLE ? `\x1b[${colorCode}m${text}\x1b[0m` : text;
}

function decodeAndFormatInstruction(pc_value: string) {
    const wordSize = creator.WORDSIZE / 8;
    const instruction = creator.dumpAddress(parseInt(pc_value, 16), wordSize);
    const instructionInt = parseInt(instruction, 16);
    const instructionBinary = instructionInt
        .toString(2)
        .padStart(creator.WORDSIZE, "0");
    const instructionASM = decode_instruction(instructionBinary);
    const instructionASMParts =
        instructionASM.instructionExecPartsWithProperNames;
    const instructionASMPartsString = instructionASMParts.join(",");

    return {
        pc: pc_value,
        instruction,
        asmString: instructionASMPartsString,
    };
}

function saveCurrentState() {
    if (MAX_STATES_TO_KEEP !== 0) {
        const state = creator.snapshot({ PREVIOUS_PC });
        previousStates.push(state);
        // If we've exceeded the maximum number of states to keep, remove the oldest one
        if (
            MAX_STATES_TO_KEEP > 0 &&
            previousStates.length > MAX_STATES_TO_KEEP
        ) {
            previousStates.shift();
        }
    }
}

function executeStep() {
    if (creator.status.execution_index === -2) {
        // Stop processing if execution is completed
        return { output: ``, completed: true, error: false };
    }
    // Save current state for unstepping
    saveCurrentState();

    const pc_value = creator.dumpRegister("PC");
    const { instruction, asmString } = decodeAndFormatInstruction(pc_value);

    // Store the current PC as previous PC before executing the step
    PREVIOUS_PC = "0x" + pc_value.toUpperCase();

    const ret: ReturnType = step();
    if (ret.error) {
        //console.error(`Error executing instruction: ${ret.msg}`);
        return { output: ``, completed: true, error: true };
    }

    return {
        output: `0x${pc_value} (0x${instruction}) ${asmString}`,
        completed: creator.status.execution_index === -2,
    };
}

function loadArchitecture(filePath: string, isaExtensions: string[]) {
    const architectureFile = fs.readFileSync(filePath, "utf8");
    const ret: ReturnType = creator.newArchitectureLoad(
        architectureFile,
        false,
        false,
        isaExtensions,
    );
    if (ret.status !== "ok") {
        console.error(`Error loading architecture: ${ret.token}.`);
        process.exit(1);
    }

    // console.log("Architecture loaded successfully.");
}

function loadBinary(filePath: string) {
    if (!filePath) {
        console.error("No binary file specified.");
        return;
    }

    const binaryFile = fs.readFileSync(filePath, "utf8");
    creator.load_binary_file(binaryFile);
    // Set the flag to indicate a binary was loaded
    BINARY_LOADED = true;
    // console.log("Binary loaded successfully.");
}

function loadLibrary(filePath: string) {
    if (!filePath) {
        console.log("No library file specified.");
        return;
    }

    const libraryFile = fs.readFileSync(filePath, "utf8");
    creator.load_library(libraryFile);
    console.log("Library loaded successfully.");
}

function assemble(filePath: string) {
    if (!filePath) {
        console.log("No assembly file specified.");
        return;
    }
    const assemblyFile = fs.readFileSync(filePath, "utf8");
    const ret: ReturnType = creator.assembly_compile(assemblyFile, true);
    if (ret.status !== "ok") {
        console.error(ret.msg);
        process.exit(1);
    }
}

function handleInstructionsCommand() {
    if (instructions.length === 0) {
        console.log("No instructions loaded.");
        return;
    }

    // Get current PC value
    const pc_value = creator.dumpRegister("PC");
    const currentPC = "0x" + pc_value.toUpperCase();

    displayInstructionsHeader();

    for (let i = 0; i < instructions.length; i++) {
        displayInstruction(instructions[i], currentPC);
    }
}

function displayInstructionsHeader() {
    if (BINARY_LOADED) {
        console.log(
            "    B | Address | Label      | Decoded Instruction     | Machine Code (hex)",
        );
    } else {
        console.log(
            "    B | Address | Label      | Loaded Instruction      | User Instruction",
        );
    }
    console.log(
        "   ---|---------|------------|-------------------------|------------------------",
    );
}

function displayInstruction(instr, currentPC, hideLibrary = false) {
    const address = instr.Address.padEnd(8);
    const label = (instr.Label || "").padEnd(11);
    let loaded = (instr.loaded || "").padEnd(23);
    const loadedIsBinary = /^[01]+$/.test(loaded);
    let rightColumn = instr.user || "";
    const breakpointMark = instr.Break ? "●" : " ";

    // When binary is loaded, display machine code in hex in the rightmost column
    if (BINARY_LOADED) {
        try {
            // Get the raw instruction from memory at this address
            const rawInstruction = creator.dumpAddress(
                parseInt(instr.Address, 16),
                4,
            );

            // Set the rightmost column to show the machine code in hex
            rightColumn = `0x${rawInstruction.toUpperCase()}`;

            // Decompile binary instructions for the middle column
            const instructionInt = parseInt(rawInstruction, 16);
            const instructionBinary = instructionInt
                .toString(2)
                .padStart(32, "0");
            const decodedInstruction = decode_instruction(instructionBinary);

            // Replace the loaded instruction with decompiled version
            if (decodedInstruction && decodedInstruction.instructionExecParts) {
                const decompiled =
                    decodedInstruction.instructionExecParts.join(" ");
                loaded = decompiled.padEnd(23);
            }
        } catch (error) {
            loaded = "???".padEnd(23);
            const rawInstruction = creator.dumpAddress(
                parseInt(instr.Address, 16),
                4,
            );
            rightColumn = `0x${rawInstruction.toUpperCase()}`;
        }
    }

    // If the loaded instruction is binary, convert it to hex. This is only
    // needed when loading a library.
    if (loadedIsBinary && !BINARY_LOADED) {
        if (hideLibrary) {
            loaded = "********".padEnd(23);
        } else {
            const instructionHex = parseInt(loaded, 2).toString(16);
            loaded = `0x${instructionHex.padStart(8, "0").toUpperCase().padEnd(21)}`;
        }
    }

    // Add an arrow for the current instruction
    const currentMark = instr.Address === currentPC ? "➤" : " ";

    let line = `${currentMark}   ${breakpointMark} | ${address}| ${label}| ${loaded} | ${rightColumn}`;

    // Highlight current instruction in green, previous in blue
    if (instr.Address === currentPC) {
        line = colorText(line, "32"); // Green for current instruction
    } else if (instr.Address === PREVIOUS_PC) {
        line = colorText(line, "33"); // Blue for previously executed instruction
    } else if (instr.Break) {
        line = colorText(line, "31"); // Red for breakpoint
    }

    console.log(line);
}

function executeNonInteractive(
    verbose: boolean = false,
    statePath: string = "",
) {
    for (let i = 0; i < MAX_INSTRUCTIONS; i++) {
        const { output, completed, error } = executeStep();
        if (error) {
            console.error("Error during execution.");
            break;
        } else if (completed) {
            break;
        }
        if (verbose) {
            console.log(output);
        }
    }
    const state = creator.getState();

    console.log(state.msg);

    // Only save state if a path is provided
    if (statePath) {
        fs.writeFileSync(statePath, state.msg, "utf8");
        console.log(`State saved to ${statePath}`);
    }
}

function listBreakpoints() {
    const breakpoints = instructions.filter(instr => instr.Break === true);

    if (breakpoints.length === 0) {
        console.log("No breakpoints set.");
        return;
    }

    console.log("Current breakpoints:");

    for (const bp of breakpoints) {
        console.log(
            `  ${bp.Address}${bp.Label ? ` (${bp.Label})` : ""}: ${bp.loaded}`,
        );
    }
}

function findInstructionByAddressOrLabel(
    userInput: string,
): { address: string; index: number } | null {
    // Normalize input
    userInput = userInput.trim();
    let address: string;

    // Check if the input already has the '0x' prefix
    if (userInput.startsWith("0x")) {
        // User explicitly provided an address
        address = userInput.toLowerCase();
    } else {
        // First try to find a matching label
        const labelMatch = instructions.find(
            instr => instr.Label === userInput,
        );

        if (labelMatch) {
            // Found a matching label, use its address
            address = labelMatch.Address.toLowerCase();
        } else {
            // No matching label found, check if it's a valid hex string
            const isValidHex = /^[0-9a-fA-F]+$/.test(userInput);

            if (isValidHex) {
                // It's a valid hex string, treat it as a hex address
                address = "0x" + userInput.toLowerCase();
            } else {
                console.log(
                    `No label or valid address found for '${userInput}'`,
                );
                return null;
            }
        }
    }

    // Find the instruction with the matching address
    const index = instructions.findIndex(
        instr => instr.Address.toLowerCase() === address.toLowerCase(),
    );

    if (index === -1) {
        console.log(`No instruction found at address ${address}`);
        return null;
    }

    return { address, index };
}

function toggleBreakpoint(index: number) {
    // Toggle breakpoint
    instructions[index].Break = !instructions[index].Break;

    // Get the instruction after toggling
    const instr = instructions[index];
    const status = instr.Break ? "set" : "removed";

    console.log(
        `Breakpoint ${status} at ${instr.Address}${
            instr.Label ? ` (${instr.Label})` : ""
        }: ${instr.loaded}`,
    );
}

function handleBreakpointCommand(args: string[]) {
    // If no arguments provided, list all breakpoints
    if (args.length < 2) {
        listBreakpoints();
        return;
    }

    // Try to find the instruction
    const result = findInstructionByAddressOrLabel(args[1]);
    if (!result) {
        return; // Error already logged in the find function
    }

    // Toggle the breakpoint
    toggleBreakpoint(result.index);
}

function handlePauseCommand() {
    EXECUTION_PAUSED = !EXECUTION_PAUSED;

    if (!EXECUTION_PAUSED) {
        // If we're resuming, continue execution
        handleRunCommand(["run"], true);
    }
}

function handleRunCommand(args: string[], silent = false) {
    // Check if we have a number argument
    const instructionsToRun =
        args.length > 1 ? parseInt(args[1], 10) : MAX_INSTRUCTIONS;

    // Make sure it's a valid number
    if (args.length > 1 && isNaN(instructionsToRun)) {
        console.log("Invalid number of instructions");
        return;
    }

    // If we're resuming from pause, make sure to reset the pause flag
    if (EXECUTION_PAUSED) {
        EXECUTION_PAUSED = false;
    }

    // Process instructions in chunks to allow for interruption
    const CHUNK_SIZE = 1000;
    let iterations = 0;
    let breakpointHit = false;

    // Helper function to process a single chunk
    function processChunk() {
        if (
            creator.status.execution_index === -2 ||
            iterations >= instructionsToRun ||
            breakpointHit ||
            EXECUTION_PAUSED
        ) {
            // Stop processing if execution is completed or paused
            return;
        }

        // Process a chunk of instructions
        const chunkEnd = Math.min(iterations + CHUNK_SIZE, instructionsToRun);

        while (
            iterations < chunkEnd &&
            creator.status.execution_index !== -2 &&
            !breakpointHit &&
            !EXECUTION_PAUSED
        ) {
            // Check for breakpoints
            const pc_value = creator.dumpRegister("PC");
            const currentPC = "0x" + pc_value.toUpperCase();

            // Find if there's a breakpoint at current PC
            for (const instr of instructions) {
                if (instr.Address === currentPC && instr.Break === true) {
                    console.log(
                        colorText("Breakpoint hit at " + currentPC, "31"),
                    );
                    breakpointHit = true;
                    break;
                }
            }
            if (breakpointHit) break;

            // Execute a step
            const { output, completed, error } = executeStep();
            if (!silent) {
                console.log(output);
            }
            iterations++;

            if (error) {
                console.error("Error during execution.");
                return;
            } else if (completed) {
                console.log(colorText("Program execution completed.", "32"));
                return;
            }
        }

        // Schedule the next chunk with setTimeout to properly yield to the event loop
        setTimeout(processChunk, 0);
    }

    // Start processing chunks
    processChunk();
}

function handleContinueCommand() {
    if (EXECUTION_PAUSED) {
        // Resume from paused state
        EXECUTION_PAUSED = false;
        console.log("Resuming execution...");
        handleRunCommand(["run"], false);
    } else {
        // If not paused, just step and then run
        handleStepCommand();
        handleRunCommand(["run"], false);
    }
}

// Interactive mode functions
function handleNurCommand() {
    if (previousStates.length === 0) {
        console.log(
            colorText("No previous states available for unstepping.", "31"),
        );
        return;
    }

    // loop through the previous states until no more states are remaining, or we hit a breakpoint
    let iterations = 0;
    let breakpointHit = false;
    while (previousStates.length > 0 && iterations < MAX_INSTRUCTIONS) {
        // Get the previous state
        const prevState = previousStates.pop();

        // Restore the previous state
        creator.restore(prevState);

        // Restore the previous PC from the state
        const stateData = JSON.parse(prevState);
        PREVIOUS_PC = stateData.extraData.PREVIOUS_PC;

        // Check if the current instruction has a breakpoint before executing
        const pc_value = creator.dumpRegister("PC");
        const currentPC = "0x" + pc_value.toUpperCase();

        // Find if there's a breakpoint at current PC
        for (const instr of instructions) {
            if (instr.Address === currentPC && instr.Break === true) {
                console.log(colorText("Breakpoint hit at " + currentPC, "31"));

                breakpointHit = true;
                break;
            }
        }
        if (breakpointHit) {
            break;
        }

        iterations++;
    }
}

function handleSnapshotCommand(args: string[]) {
    if (args.length > 1) {
        const filename = args[1];
        // Dictionary with the previous PC
        const previousPC = { PREVIOUS_PC };
        // Add the previous PC to the state
        const state = creator.snapshot(previousPC);
        Deno.writeTextFileSync(filename, state);
        console.log(`Snapshot saved to ${filename}`);
    } else {
        const state = creator.snapshot({ PREVIOUS_PC });
        // Timestamp the snapshot
        const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
        const filename = `snapshot-${timestamp}.json`;
        // Save the snapshot to a file
        Deno.writeTextFileSync(filename, state);
        console.log(`Snapshot saved to ${filename}`);
    }
}

function handleRestoreCommand(args: string[]) {
    if (args.length > 1) {
        // First reset the state
        creator.reset();
        const filename = args[1];
        // const filename = "snapshot.json";
        const state = fs.readFileSync(filename, "utf8");
        creator.restore(state);
        // Restore the previous PC
        const previousPC = JSON.parse(state).extraData.PREVIOUS_PC;
        PREVIOUS_PC = previousPC;
        console.log(`State restored from ${filename}`);
    } else {
        console.log("Usage: restore <filename>");
    }
}

function handleAboutCommand() {
    clearConsole();

    if (!ACCESSIBLE) {
        // Display the ASCII art with colors
        const coloredASCII = creatorASCII
            .split("\n")
            .map(line => colorText(line, "32"))
            .join("\n");
        console.log(coloredASCII);

        // Create a fancy box for info
        console.log("\n" + "╔" + "═".repeat(60) + "╗");
        console.log("║" + " CREATOR Information".padEnd(60) + "║");
        console.log("╠" + "═".repeat(60) + "╣");

        // Application info
        console.log(
            "║" +
                colorText(" ⚙️  CREATOR CLI Version:", "33") +
                ` ${CLI_VERSION}`.padEnd(36) +
                "║",
        );
        console.log(
            "║" +
                colorText(" 🚀 CREATOR Core Version:", "33") +
                " 6.0.0".padEnd(35) +
                "║",
        );
        console.log(
            "║" +
                colorText(" 🔧 Deno Version:", "33") +
                ` ${Deno.version.deno}`.padEnd(43) +
                "║",
        );

        // System info
        console.log("╠" + "═".repeat(60) + "╣");
        console.log("║" + " System Information".padEnd(60) + "║");
        console.log("╠" + "═".repeat(60) + "╣");
        console.log(
            "║" +
                colorText(" 💻 Platform:", "32") +
                ` ${process.platform}`.padEnd(47) +
                "║",
        );
        console.log(
            "║" +
                colorText(" 🧠 Architecture:", "32") +
                ` ${process.arch}`.padEnd(43) +
                "║",
        );

        // Credits and copyright
        console.log("╠" + "═".repeat(60) + "╣");
        console.log("║" + " About".padEnd(60) + "║");
        console.log("╠" + "═".repeat(60) + "╣");
        console.log(
            "║" +
                " CREATOR is a didactic and generic assembly".padEnd(60) +
                "║",
        );
        console.log(
            "║" + " simulator built by the ARCOS group at the".padEnd(60) + "║",
        );
        console.log(
            "║" + " Carlos III de Madrid University (UC3M)".padEnd(60) + "║",
        );
        console.log(
            "║" +
                colorText(" © Copyright (C) 2025 CREATOR Team", "35").padEnd(
                    69,
                ) +
                "║",
        );
        console.log("╚" + "═".repeat(60) + "╝");
        console.log("\n");
    } else {
        // Accessible version
        console.log(
            "CREATOR - didaCtic and geneRic assEmbly progrAmming simulaTOR",
        );
        console.log("\nCREATOR Information");
        console.log("CREATOR CLI Version: " + CLI_VERSION);
        console.log("CREATOR Core Version: 6.0.0");
        console.log("Deno Version: " + Deno.version.deno);

        console.log("\nSystem Information");
        console.log("Platform: " + process.platform);
        console.log("Architecture: " + process.arch);

        console.log("\nAbout");
        console.log("CREATOR is a didactic and generic assembly simulator");
        console.log("designed for teaching computer architecture concepts.");
        console.log("Copyright (C) 2025 CREATOR Team");
    }
}

function handleResetCommand() {
    creator.reset();

    // Reset the previous PC tracking
    PREVIOUS_PC = "0x0";

    // Clear the previous states when resetting
    previousStates = [];

    console.log(colorText("Program reset.", "32"));
}

function handleInsnCommand() {
    const pc_value = creator.dumpRegister("PC");
    const { instruction, asmString } = decodeAndFormatInstruction(pc_value);
    console.log(`0x${instruction} ${asmString}`);
}

function handleStepCommand() {
    const { output, completed, error } = executeStep();
    if (output) {
        console.log(output);
    }
    if (error) {
        console.error(colorText("Error during execution.", "31"));
    } else if (completed) {
        console.log(colorText("Program execution completed.", "32"));
    }
}

function handleUnstepCommand() {
    if (previousStates.length === 0) {
        console.log(
            colorText("No previous states available for unstepping.", "31"),
        );
        return;
    }

    // Get the previous state
    const prevState = previousStates.pop();

    // Restore the previous state
    creator.restore(prevState);

    // Restore the previous PC from the state
    const stateData = JSON.parse(prevState);
    PREVIOUS_PC = stateData.extraData.PREVIOUS_PC;

    handleInsnCommand();
}

function handleClearCommand() {
    clearConsole();
}

function displayRegistersByBank(regType: string, format: string = "raw") {
    const registerBank = creator.getRegistersByBank(regType);

    if (!registerBank) {
        console.log(`Register type "${regType}" not found.`);
        return;
    }

    console.log(`${registerBank.name}:`);

    // Display registers in a table format
    let rowCount = Math.ceil(registerBank.elements.length / 4);

    // First, calculate max width for each column
    const maxWidths = [0, 0, 0, 0]; // For up to 4 columns
    for (let row = 0; row < rowCount; row++) {
        for (let col = 0; col < 4; col++) {
            const index = row * 4 + col;
            if (index < registerBank.elements.length) {
                const reg = registerBank.elements[index];
                const primaryName = reg.name[0];
                const altNames = reg.name.slice(1).join(",");
                const displayName = altNames
                    ? `${primaryName}(${altNames})`
                    : primaryName;
                maxWidths[col] = Math.max(maxWidths[col], displayName.length);
            }
        }
    }

    for (let row = 0; row < rowCount; row++) {
        let line = "";
        for (let col = 0; col < 4; col++) {
            const index = row * 4 + col;
            if (index < registerBank.elements.length) {
                const reg = registerBank.elements[index];
                const primaryName = reg.name[0];
                const altNames = reg.name.slice(1).join(",");

                // Get the register's bit width and calculate hex digits needed
                const nbits = reg.nbits;
                const hexDigits = Math.ceil(nbits / 4);
                let value;

                const rawValue = creator.dumpRegister(
                    primaryName,
                    reg.type === "fp_registers" ? "raw" : "twoscomplement",
                );
                const floatValue = creator.dumpRegister(primaryName, "decimal");

                // Format the value based on the requested format
                if (format === "raw") {
                    value = `0x${rawValue.padStart(hexDigits, "0")}`;
                } else if (format === "decimal" || format === "dec") {
                    value = `${floatValue.toString(10)}`;
                } else {
                    console.log(`Unknown format "${format}"`);
                    return;
                }
                const displayName = altNames
                    ? `${primaryName}(${altNames})`
                    : primaryName;

                const coloredName = colorText(
                    displayName.padEnd(maxWidths[col]),
                    "36",
                );
                line += `${col > 0 ? "  " : ""}${coloredName}: ${`${value}`}`;
            }
        }
        console.log(line);
    }
}

function displayRegisterTypes() {
    const types = creator.getRegisterTypes();

    console.log("Register types:");
    types.forEach(type => {
        console.log(`  ${type}`);
    });

    console.log("\nUse 'reg <type>' to show registers of a specific type");
}

function handleRegCommand(args: string[]) {
    if (args.length < 2) {
        console.log("Usage: reg <type> | reg list | reg <register> [format]");
        console.log("Use 'reg list' to see available register types");
        console.log("Format options: raw (default), number");
        return;
    }

    const cmd = args[1].toLowerCase();
    const format = args[2] || "raw";

    if (cmd === "list") {
        // Display all available register types
        displayRegisterTypes();
    } else {
        // This can either be a request for a specific register bank, or for a specific register
        const regType = args[1].toLowerCase();
        const regTypes = creator.getRegisterTypes();
        if (regTypes.includes(regType)) {
            // Display registers of a specific type
            displayRegistersByBank(cmd, format);
        } else {
            // If not a valid type, check if it's a register name
            const regName = args[1];
            const regInfo = creator.getRegisterInfo(regName);
            if (!regInfo) {
                console.log(`Register "${regName}" not found.`);
                return;
            }

            const rawValue = creator.dumpRegister(
                regName,
                regInfo.type === "fp_registers" ? "raw" : "twoscomplement",
            );
            const floatValue = creator.dumpRegister(regName, "decimal");
            console.log(`${regName}: 0x${rawValue} | ${floatValue}`);
        }
    }
}

function displayMemory(address, count) {
    // Display memory contents in rows of 16 bytes
    for (let i = 0; i < count; i += 4) {
        const bytes = creator.dumpAddress(address + i, 4);
        console.log(
            `0x${(address + i).toString(16).padStart(8, "0")}: 0x${bytes}`,
        );
    }
}

function handleMemCommand(args: string[]) {
    if (args.length > 1) {
        const address = parseInt(args[1], 16);
        const count = args.length > 2 ? parseInt(args[2], 10) : 4;
        displayMemory(address, count);
    } else {
        console.log("Usage: mem <address> [count]");
    }
}

function handleHexViewCommand(args: string[]) {
    if (args.length > 1) {
        const address = parseInt(args[1], 16);
        const count = args.length > 2 ? parseInt(args[2], 10) : 16;
        const bytesPerLine = parseInt(args[3], 10) || 16;
        console.log(creator.dumpMemory(address, count, bytesPerLine));
    } else {
        console.log("Usage: hexview <address> [count]");
    }
}

// Helper function to find a label for a memory address
function findLabelForAddress(address: string): string {
    // Convert input address to standard format (lowercase with 0x prefix)
    if (!address) return "unknown";

    const normalizedAddress = address.toLowerCase();

    // Search through instructions for a matching address
    for (const instr of instructions) {
        if (instr.Address.toLowerCase() === normalizedAddress && instr.Label) {
            return instr.Label;
        }
    }

    // Return the original address if no label is found
    return address;
}

// eslint-disable-next-line max-lines-per-function
function handleStackCommand(args: string[]) {
    try {
        // Get the stack frames information
        const stackFrames = track_stack_getFrames();
        const stackNames = track_stack_getNames();
        const stackHints = track_stack_getAllHints();

        if (!stackFrames.ok || stackFrames.val.length === 0) {
            console.log("No stack information available.");
            return;
        }

        // 1. Display call stack hierarchy
        console.log(
            ACCESSIBLE ? "Call Stack:" : colorText("Call Stack:", "36"),
        );

        // Visual representation with indentation
        for (let i = stackFrames.val.length - 1; i >= 0; i--) {
            const frame = stackFrames.val[i];
            // Get function name from label or fall back to address
            const addressStr = stackNames.val[i] || "";
            const functionName = findLabelForAddress(addressStr) || "unknown";
            const depth = stackFrames.val.length - 1 - i;
            const indent = "  ".repeat(depth);
            const frameSize = frame.begin_callee - frame.end_callee;
            const prefix = i === stackFrames.val.length - 1 ? "►" : "•";

            // Current frame in green, others in default
            const color = i === stackFrames.val.length - 1 ? "32" : "0";

            const beginAddress = parseInt(frame.begin_callee, 16);
            const beginAddressHex = `0x${beginAddress.toString(16).toUpperCase()}`;
            const endAddress = parseInt(frame.end_callee, 16);
            const endAddressHex = `0x${endAddress.toString(16).toUpperCase()}`;

            console.log(
                colorText(
                    `${indent}${prefix} ${functionName} (${beginAddressHex} - ${endAddressHex}, ${frameSize} bytes)`,
                    color,
                ),
            );
        }

        // 2. Show stack frame details for the current (top) frame
        const stackTop = stackFrames.val[stackFrames.val.length - 1];
        console.log(colorText("\nCurrent Frame Details:", "36"));

        // Get function name from label for current function
        const currentAddrStr = stackNames.val[stackNames.val.length - 1] || "";
        const currentFuncName =
            findLabelForAddress(currentAddrStr) || "unknown";

        console.log(`Function: ${currentFuncName}`);

        const beginAddress = parseInt(stackTop.begin_callee, 16);
        const beginAddressHex = `0x${beginAddress.toString(16).toUpperCase()}`;
        const endAddress = parseInt(stackTop.end_callee, 16);
        const endAddressHex = `0x${endAddress.toString(16).toUpperCase()}`;

        console.log(`Frame: ${beginAddressHex} - ${endAddressHex}`);

        // Calculate frame size
        const frameSize = stackTop.begin_callee - stackTop.end_callee;
        console.log(`Size: ${frameSize} bytes`);

        if (
            stackFrames.val.length > 1 &&
            stackTop.begin_caller !== stackTop.begin_callee
        ) {
            // Get function name from label for caller
            const callerAddrStr =
                stackNames.val[stackNames.val.length - 2] || "";
            const callerFuncName =
                findLabelForAddress(callerAddrStr) || "unknown";

            const callerBeginAddress = parseInt(stackTop.begin_callee, 16);
            const callerBeginAddressHex = `0x${callerBeginAddress.toString(16).toUpperCase()}`;
            const callerEndAddress = parseInt(stackTop.end_callee, 16);
            const callerEndAddressHex = `0x${callerEndAddress.toString(16).toUpperCase()}`;

            console.log(`Caller: ${callerFuncName}`);
            console.log(
                `Caller frame: ${callerBeginAddressHex} - ${callerEndAddressHex}`,
            );
        }

        // 3. Show stack memory contents
        console.log(colorText("\nStack Memory Contents:", "36"));

        // Calculate the range to display for the entire stack, not just current frame
        // Get current stack pointer
        const startAddressHex = stackTop.end_callee;
        const startAddress = parseInt(startAddressHex, 16);

        // Find the highest address in the stack (from the bottom-most frame)
        // This is the beginning of the first frame in the stack
        const bottomFrame = stackFrames.val[0];
        const stackEndAddressHex =
            bottomFrame.begin_caller || bottomFrame.begin_callee;
        let stackEndAddress = parseInt(stackEndAddressHex, 16);

        // If stack is very large, limit to a reasonable number of bytes
        const maxBytesToShow = args.length > 2 ? parseInt(args[2], 10) : 256;
        const bytesToShow = Math.min(
            stackEndAddress - startAddress,
            maxBytesToShow,
        );
        stackEndAddress = startAddress + bytesToShow;

        // Show memory contents with frame boundary annotations
        for (let addr = startAddress; addr < stackEndAddress; addr += 4) {
            const bytes = creator.dumpAddress(addr, 4);
            const valueStr = "0x" + bytes.padStart(8, "0").toUpperCase();
            const formattedAddr = `0x${addr.toString(16).padStart(8, "0").toUpperCase()}`;

            // Identify which frame this address belongs to and add annotations
            let annotation = "";
            let frameIndex = -1;

            // Find which frame this address belongs to
            for (let i = 0; i < stackFrames.val.length; i++) {
                const frame = stackFrames.val[i];
                const endCallee = parseInt(frame.end_callee, 16);
                const beginCallee = parseInt(frame.begin_callee, 16);

                if (addr >= endCallee && addr < beginCallee) {
                    frameIndex = i;
                    break;
                }
            }

            // Check if there's a hint for this address
            if (stackHints.ok) {
                const hint = stackHints.val[formattedAddr];
                if (hint) {
                    annotation += (annotation ? ", " : "") + `"${hint}"`;
                }
            }

            // Mark stack pointer
            const stackPointer = parseInt(stackTop.end_callee, 16);
            if (addr === stackPointer) {
                annotation += (annotation ? ", " : "") + "← SP";
            }

            // Mark frame boundaries
            for (let i = 0; i < stackFrames.val.length; i++) {
                const frame = stackFrames.val[i];
                if (
                    addr === frame.end_callee &&
                    i !== stackFrames.val.length - 1
                ) {
                    // Get function name from label
                    const funcName =
                        findLabelForAddress(stackNames.val[i] || "") ||
                        "unknown";
                    annotation +=
                        (annotation ? ", " : "") + `← ${funcName} frame start`;
                }
                if (addr === frame.begin_callee - 4) {
                    // Get function name from label
                    const funcName =
                        findLabelForAddress(stackNames.val[i] || "") ||
                        "unknown";
                    annotation +=
                        (annotation ? ", " : "") + `← ${funcName} frame end`;
                }
            }

            // Color-code by frame
            let line = `${formattedAddr}: ${valueStr.padEnd(10)} ${annotation}`;
            if (frameIndex >= 0) {
                // Use different colors for different frames
                const colorCodes = ["32", "33", "36", "35", "34"];
                const colorCode = colorCodes[frameIndex % colorCodes.length];
                line = colorText(line, colorCode);
            }

            console.log(line);
        }
    } catch (error) {
        console.error("Error retrieving stack information:", error.message);
    }
}

function handleAliasCommand() {
    if (Object.keys(CONFIG.aliases).length === 0) {
        console.log("No aliases defined.");
        return;
    }

    console.log("Current command aliases:");

    if (ACCESSIBLE) {
        // Simple list format for accessible mode
        Object.entries(CONFIG.aliases).forEach(([alias, command]) => {
            console.log(`'${alias}' > '${command}'`);
        });
    } else {
        // Table format for standard mode
        const maxAliasLength = Math.max(
            ...Object.keys(CONFIG.aliases).map(a => a.length),
        );

        Object.entries(CONFIG.aliases)
            .sort((a, b) => a[0].localeCompare(b[0])) // Sort by alias name
            .forEach(([alias, command]) => {
                const paddedAlias = alias.padEnd(maxAliasLength);
                console.log(`  ${colorText(paddedAlias, "36")} → ${command}`);
            });
    }

    console.log("\nAliases can be defined in your config file at:");
    console.log(CONFIG_PATH);
}

function handleBreakpointAtCurrentPC() {
    // Get current PC value
    const pc_value = creator.dumpRegister("PC");
    const currentPC = "0x" + pc_value.toUpperCase();

    // Find the instruction index with this address
    const index = instructions.findIndex(
        instr => instr.Address.toLowerCase() === currentPC.toLowerCase(),
    );

    if (index === -1) {
        console.log(`No instruction found at current PC: ${currentPC}`);
        return;
    }

    // Toggle the breakpoint
    toggleBreakpoint(index);
}

function handleUntilCommand(args: string[]) {
    if (args.length < 2) {
        console.log("Usage: until <address>");
        return;
    }
    // Basically set a breakpoint, run until it hits it and then remove it
    handleBreakpointCommand(args);
    handleRunCommand(["run"]);
    handleBreakpointAtCurrentPC();
}

// eslint-disable-next-line max-lines-per-function
function parseArguments(): ArgvOptions {
    return yargs(hideBin(process.argv))
        .usage("Usage: $0 [options]")
        .option("architecture", {
            alias: "a",
            type: "string",
            description: "Architecture file to load",
            demandOption: true,
        })
        .option("isa", {
            alias: "i",
            type: "array",
            description: "ISA extensions to load (e.g. --isa I M F D)",
            default: [],
        })
        .option("binary", {
            alias: "b",
            type: "string",
            describe: "Binary file",
            nargs: 1,
            default: "",
        })
        .option("library", {
            alias: "l",
            type: "string",
            describe: "Library file",
            nargs: 1,
            default: "",
        })
        .option("assembly", {
            alias: "s",
            type: "string",
            describe: "Assembly file to assemble",
            nargs: 1,
            default: "",
        })
        .option("interactive", {
            alias: "I",
            type: "boolean",
            describe: "Run in interactive mode",
            default: false,
        })
        .option("debug", {
            alias: "v",
            type: "boolean",
            describe: "Enable debug mode",
            default: false,
        })
        .option("reference", {
            alias: "r",
            type: "string",
            describe: "Reference file to load",
            default: "",
        })
        .option("state", {
            type: "string",
            describe: "File to save the state",
            default: "",
        })
        .option("accessible", {
            alias: "A",
            type: "boolean",
            describe: "Enable accessible mode for use with screen readers",
            default: false,
        })
        .option("tutorial", {
            alias: "T",
            type: "boolean",
            describe: "Start an interactive tutorial for RISC-V programming",
            default: false,
        })
        .option("config", {
            alias: "c",
            type: "string",
            describe: "Path to configuration file",
            default: CONFIG_PATH,
        })
        .option("verbose", {
            alias: "V",
            type: "boolean",
            describe: "Print detailed output in non-interactive mode",
            default: false,
        })
        .help().argv as ArgvOptions;
}
// eslint-disable-next-line max-lines-per-function
function processCommand(cmd: string, args: string[]): boolean {
    // Apply alias substitution
    const resolved = applyAlias(cmd, args);
    cmd = resolved.cmd;
    args = resolved.args;
    switch (cmd) {
        case "step":
        case "":
            handleStepCommand();
            break;
        case "unstep":
            handleUnstepCommand();
            break;
        case "run":
            handleRunCommand(args);
            break;
        case "continue":
            handleContinueCommand();
            break;
        case "pause":
            handlePauseCommand();
            break;
        case "nur":
            handleNurCommand();
            break;
        case "silent":
            handleRunCommand(args, true);
            break;
        case "until":
            handleUntilCommand(args);
            break;
        case "break":
            handleBreakpointCommand(args);
            break;
        case "reg":
            handleRegCommand(args);
            break;
        case "mem":
            handleMemCommand(args);
            break;
        case "hexview":
            handleHexViewCommand(args);
            break;
        case "list":
            handleInstructionsCommand();
            break;
        case "reset":
            handleResetCommand();
            break;
        case "clear":
            handleClearCommand();
            break;
        case "help":
            displayHelp();
            break;
        case "insn":
            handleInsnCommand();
            break;
        case "snapshot":
            handleSnapshotCommand(args);
            break;
        case "restore":
            handleRestoreCommand(args);
            break;
        case "about":
            handleAboutCommand();
            break;
        case "alias":
            handleAliasCommand();
            break;
        case "stack":
            handleStackCommand(args);
            break;
        case "quit":
            return true;
        default:
            console.log(`Unknown command: ${cmd}`);
            console.log("Type 'help' for available commands.");
    }
    return false;
}

// eslint-disable-next-line max-lines-per-function
function interactiveMode() {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
        prompt: "CREATOR> ",
    });

    // Determine if keyboard shortcuts are enabled from config
    const keyboardShortcutsEnabled =
        CONFIG.settings.keyboard_shortcuts !== undefined
            ? CONFIG.settings.keyboard_shortcuts
            : true;

    // Determine if auto-list after shortcuts is enabled
    const autoListAfterShortcuts =
        CONFIG.settings.auto_list_after_shortcuts !== undefined
            ? CONFIG.settings.auto_list_after_shortcuts
            : false;

    if (ACCESSIBLE) {
        console.log(
            "Interactive mode enabled. Type 'help' or 'h' for available commands.",
        );
        console.log(
            "You are in accessible mode, with special formatting for screen readers.",
        );
    } else {
        console.log(
            colorText(
                "Interactive mode enabled. Type 'help' for available commands.",
                "32",
            ),
        );
    }

    // Setup for raw mode keyboard input if shortcuts are enabled
    if (keyboardShortcutsEnabled) {
        // Configure stdin for raw mode
        process.stdin.setRawMode(true);
        process.stdin.resume();
        process.stdin.setEncoding("utf8");

        // Handle keypress events
        process.stdin.on("data", (key: Buffer) => {
            const keyStr = key.toString();

            // Skip processing Enter key (CR/LF) as a shortcut
            if (keyStr === "\r" || keyStr === "\n" || keyStr === "\r\n") {
                return; // Let readline handle Enter key
            }

            // Check if the key is a mapped shortcut
            if (CONFIG.shortcuts && CONFIG.shortcuts[keyStr]) {
                // Execute the command
                const cmd = CONFIG.shortcuts[keyStr];

                // Special case handlers for commands that need specific arguments
                if (cmd === "break") {
                    handleBreakpointAtCurrentPC();
                } else if (cmd === "clear") {
                    handleClearCommand();
                } else {
                    processCommand(cmd, [cmd]);
                }

                // Show instruction listing after the command if auto-list is enabled
                if (autoListAfterShortcuts && shouldAutoListAfterCommand(cmd)) {
                    // Clear the current line
                    clearConsole();
                    handleInstructionsCommand();
                }
            }
            // Other keys are passed through to readline
        });
    }

    rl.prompt();

    rl.on("line", line => {
        const args = line.trim().split(/\s+/);
        const cmd = args[0].toLowerCase();

        try {
            if (processCommand(cmd, args)) {
                if (keyboardShortcutsEnabled) {
                    process.stdin.setRawMode(false);
                }
                rl.close();
                return;
            }
        } catch (error) {
            console.error(`Error executing command: ${error.message}`);
        }
        rl.prompt();
    });

    rl.on("close", () => {
        if (keyboardShortcutsEnabled) {
            process.stdin.setRawMode(false);
        }
        process.exit(0);
    });
}

function checkTerminalSize() {
    // Only check if we have access to the terminal size
    if (!process.stdout.columns || !process.stdout.rows) {
        return; // Skip size check if terminal dimensions aren't available
    }

    const { columns, rows } = process.stdout;
    const minColumns = 80; // Reduced from 95
    const minRows = 24; // Reduced from 31

    // Instead of exiting, just warn the user
    if (columns < minColumns || rows < minRows) {
        console.warn(
            `Warning: Terminal size ${columns}x${rows} is smaller than recommended ${minColumns}x${minRows}. ` +
                `Some output may not display correctly.`,
        );
    }
}

function main() {
    // Check terminal size
    checkTerminalSize();
    // Parse command line arguments
    const argv: ArgvOptions = parseArguments();

    // Load configuration
    CONFIG = loadConfiguration(argv.config);

    // Apply configuration settings
    applyConfiguration(CONFIG);

    // Command line arguments take precedence over config
    if (argv.accessible) {
        ACCESSIBLE = argv.accessible;
    }

    if (!argv.debug) {
        logger.disable();
    }

    TUTORIAL_MODE = argv.tutorial;

    // Load architecture
    loadArchitecture(argv.architecture, argv.isa);

    // Reset BINARY_LOADED flag before loading any files
    BINARY_LOADED = false;

    // Check if we're in tutorial mode
    if (TUTORIAL_MODE) {
        creator.reset();
        startTutorial();
        return;
    }

    // If binary file is provided, load it
    if (argv.binary) {
        loadBinary(argv.binary);
    } else {
        if (argv.library) {
            loadLibrary(argv.library);
        }
        if (argv.assembly) {
            assemble(argv.assembly);
        }
    }

    // Run in interactive or non-interactive mode
    if (argv.interactive) {
        clearConsole();
        if (!ACCESSIBLE) {
            console.log(creatorASCII);
        }
        creator.reset();
        interactiveMode();
    } else {
        executeNonInteractive(argv.verbose, argv.state);
        if (argv.reference) {
            const referenceState = fs.readFileSync(argv.reference, "utf8");
            const state = creator.getState();
            const ret = creator.diffStates(referenceState, state.msg);
            if (ret.status === "ok") {
                console.log("States are equal");
            }
            if (ret.status === "different") {
                console.log(ret.diff);
                // exit with error code 1
                process.exit(1);
            }
        }
    }
}

export {
    handleStepCommand,
    handleRunCommand,
    handleBreakpointCommand,
    handleRegCommand,
    handleMemCommand,
    handleInstructionsCommand,
    handleInsnCommand,
    handleStackCommand,
    handleResetCommand,
    displayHelp,
    clearConsole,
    colorText,
    processCommand,
};

main();
