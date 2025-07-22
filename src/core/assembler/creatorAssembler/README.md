# CREATOR Assembler
The source code is located at [ALVAROPING1/CreatorCompiler](https://github.com/ALVAROPING1/CreatorCompiler), and must be built for both the CLI and Web versions.

Building requires [rustup](https://rustup.rs/).


## CLI
Compilation is done through [Deno](https://deno.com/):
```
deno run -A jsr:@deno/wasmbuild
```

The generated files (inside `lib/` subdirectory) must be placed inside `src/core/assembler/creatorAssembler/deno/wasm/`.


## Web
Compilation is done through [wasm-pack](https://rustwasm.github.io/wasm-pack/installer/init.sh):
```
wasm-pack build --target web
```

<!-- TODO: when compiler is a submodule, use something like [vite-plugin-wasm-pack](https://www.npmjs.com/package/vite-plugin-wasm-pack) to automagically compile the web version -->

> [!NOTE]
> If you're building for development purposes, you can add the `--dev` flag to generate a debug mode with a shorter compile time.

The generated files (inside `pkg/` subdirectory) must be placed inside `src/core/assembler/creatorAssembler/web/wasm/`.
