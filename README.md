# tree-sitter-c

[![CI][ci]](https://github.com/tree-sitter/tree-sitter-c/actions/workflows/ci.yml)
[![discord][discord]](https://discord.gg/w7nTvsVJhm)
[![matrix][matrix]](https://matrix.to/#/#tree-sitter-chat:matrix.org)
[![crates][crates]](https://crates.io/crates/tree-sitter-c)
[![npm][npm]](https://www.npmjs.com/package/tree-sitter-c)
[![pypi][pypi]](https://pypi.org/project/tree-sitter-c)

C grammar for [tree-sitter](https://github.com/tree-sitter/tree-sitter).
Adapted from [this C99 grammar](http://slps.github.io/zoo/c/iso-9899-tc3.html).

## Module grammar prototype

This branch uses the experimental module DSL in `grammar.mjs`. Its named
exports are rule handles; reusable utilities for derived grammars such as C++
live in `grammar-helpers.mjs`. Node bindings remain CommonJS.

Reserved names use `true_`, `false_`, and `null_` in the same export chain. The
DSL removes one trailing underscore when assigning grammar names, so these
declarations can retain their original positions and precedence behavior.

Use a checkout of the Tree-sitter module-grammar prototype beside this checkout
as `../tree-sitter`, with both checkouts on `prototype/module-grammar-dsl`.
Install with `npm install --ignore-scripts`, then run:

```sh
npm run generate
npm run test:corpus
npm run lint
```

The npm scripts run the CLI from that checkout through Cargo, not a downloaded
release binary. For non-sibling checkouts, set `TREE_SITTER_DIR` to its absolute
path and link its DSL types locally without changing the portable dependency:

```sh
export TREE_SITTER_DIR=/absolute/path/to/tree-sitter
npm install --ignore-scripts --no-save --no-package-lock "$TREE_SITTER_DIR/crates/cli/npm"
npm run generate
```

`preprocIf(suffix, content, symbols, precedence = 0)` returns a
family of rule handles. `content` and `symbols` are zero-argument callbacks;
`symbols` provides `identifier`, `_preproc_expression`, `preproc_else`,
`preproc_elif`, and `preproc_elifdef`. Derived grammars export the returned
handles under the inherited names to replace those definitions.
Rule builders take no arguments; derived builders can call an imported rule
handle's `.body()` method to extend that handle's body explicitly.

For direct Make/CMake builds, select the prototype executable using `TS` or
`TREE_SITTER_CLI`, respectively. The existing hosted workflows still select
released tooling; they need matching prototype checkouts to regenerate this DSL.

[ci]: https://img.shields.io/github/actions/workflow/status/tree-sitter/tree-sitter-c/ci.yml?logo=github&label=CI
[discord]: https://img.shields.io/discord/1063097320771698699?logo=discord&label=discord
[matrix]: https://img.shields.io/matrix/tree-sitter-chat%3Amatrix.org?logo=matrix&label=matrix
[npm]: https://img.shields.io/npm/v/tree-sitter-c?logo=npm
[crates]: https://img.shields.io/crates/v/tree-sitter-c?logo=rust
[pypi]: https://img.shields.io/pypi/v/tree-sitter-c?logo=pypi&logoColor=ffd242
