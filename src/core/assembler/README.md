# Assembler Integration

The CREATOR ecosystem provides a framework for integrating new assemblers. This is a general overview of how to integrate a new assembler into the system:

## Targets

There are two compilation targets for the assemblers:

-   **web**: The assembler is compiled to WebAssembly to be run in the browser.
-   **deno**: The assembler is a native executable that is called from the Deno runtime.

## Folder Structure

To integrate a new assembler, you need to follow this folder structure:

```
src/core/assembler/
├── <assembler_name>/
│   ├── deno/
│   │   └── <assembler_name>.mjs
│   ├── web/
│   │   ├── wasm/
│   │   │   ├── <assembler_name>.js
│   │   │   └── <assembler_name>.wasm
│   │   └── <assembler_name>.mjs
│   └── utils.mjs
```

-   `<assembler_name>`: The name of your assembler.
-   `deno/<assembler_name>.mjs`: The Deno module that calls the native assembler.
-   `web/wasm/<assembler_name>.js`: The JavaScript glue code for the WebAssembly module.
-   `web/wasm/<assembler_name>.wasm`: The WebAssembly module itself.
-   `web/<assembler_name>.mjs`: The web module that uses the WebAssembly module.
-   `utils.mjs`: (Optional) A file for utility functions shared between the web and Deno versions.

## Internal Structures

Your assembler module (both for web and Deno) must populate the following internal structures:

-   **`main_memory`**: The main memory of the simulated machine. Your assembler should load the assembled binary code into `main_memory` using `main_memory.loadROM(binary)`.
-   **`instructions`**: An array of decoded instructions. After loading the binary into memory, you need to call `precomputeInstructions(sourceCode, sourceMap, parsedSymbols)` to decode the instructions from memory and populate this array.
-   **`tag_instructions`**: A dictionary that maps labels to their corresponding memory addresses. This is used for debugging and for jumping to labels in the code. You can populate this by parsing the symbol file generated by your assembler and then calling `set_tag_instructions`.

## Implementation Details

### Web Version (`web/<assembler_name>.mjs`)

The web version of your assembler should:

1.  Load the WebAssembly module.
2.  Create a virtual file system in the browser using `module.FS`.
3.  Write the assembly source code to a file in the virtual file system.
4.  Call the `main` function of the WebAssembly module with the appropriate command-line arguments to assemble the code.
5.  Read the generated binary and symbol files from the virtual file system.
6.  Populate the internal structures as described above.

### Deno Version (`deno/<assembler_name>.mjs`)

The Deno version of your assembler should:

1.  Write the assembly source code to a temporary file on the local file system.
2.  Use `spawnSync` to execute the native assembler with the appropriate command-line arguments.
3.  Read the generated binary and symbol files from the local file system.
4.  Populate the internal structures as described above.
5.  Clean up the temporary files.

To add the newly created assembler to the system, the last step is to update the assembler map in the web and Deno modules. For the Deno version, you can add it to the `assembler_map` in `src/cli/creator6.mts`, and to the `assembler_map` in `rpc-server/server.mts`. For the web version, you can add it to the `assembler_map` in `src/core/assembler/web/web.mjs`.

