# Validator
CREATOR CLI allows you to validate a program against an expected final state. This includes specifying the values of memory, registers (including floating point registers, within an error threshold), and the display buffer, and whether to error on calling convention errors (sentinel).

For this, you first need to define a YAML validator file, following the JSON schema found at [`docs/schema/validator-file.json`](../docs/schema/validator-file.json).

The validator will return, following UNIX conventions, `0` if its valid and `1` if it's not, writting the error message to `stderr`.


### Example
Imagine you want to validate the `assembly.s` program with the `RV32IMFD` architecture, against the following `config.yml` file:
```yaml
# yaml-language-server: $schema=https://creatorsim.github.io/schema/validator-file.json
maxCycles: 100
floatThreshold: 10e-10
sentinel: true
state:
  floatRegisters:
    f0: 0x40866666
  registers:
    sp: 0x0FFFFFFC
    a1: 0x0000005A
  memory:
    "0x200000": 0x45
  display: "-144"
```

To validate this, you would run:
```bash
creator-cli -a RV32IMFD.yml -s assembly.s --validate config.yml
```
