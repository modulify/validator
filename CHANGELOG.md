# Changelog

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

### [0.2.1](https://github.com/modulify/validator/compare/v0.2.0...v0.2.1) (2026-03-09)

## [0.2.0](https://github.com/modulify/validator/compare/v0.1.0...v0.2.0) (2026-03-09)


### ⚠ BREAKING CHANGES

* Validation API was redesigned around typed tuples
* legacy assertion entrypoints were removed, assertion exports now use camelCase names, and violations now expose structured metadata via violates.{predicate,rule,args}.
* isObject now returns false on null values, added isShape predicate constructor for checking objects structures
* Injecting check utility into Assertion

### Features

* Added JSON Schema export entrypoint ([0b3ec5b](https://github.com/modulify/validator/commit/0b3ec5b008418d7e7ceaa4a603341f24dc454b48))
* Added metadata and introspection API ([16ea412](https://github.com/modulify/validator/commit/16ea41268424dc878271227ad4e58cd2cd089c2d))
* Added simple runtime predicates for built-in values ([11c9f19](https://github.com/modulify/validator/commit/11c9f1996988e7c3ac45c8632caa1c7198ab2792))
* Added violation collection utilities ([64e9e36](https://github.com/modulify/validator/commit/64e9e36da63a672263f5ac48ef7b22e992dc6148))
* **assertions:** Added reusable assertion mixins for strings and numbers ([658dc9f](https://github.com/modulify/validator/commit/658dc9f32d1936fcd080969d55415aa5b450ec05))
* **combinators:** Added object-level shape refinement runtime ([2e2607f](https://github.com/modulify/validator/commit/2e2607f29211db48e5d46652ccef6b4cc185647d))
* **combinators:** Added tuple and record validators ([71742f9](https://github.com/modulify/validator/commit/71742f9216c7e20d6c3535af965dc2c134c5b4e8))
* **combinators:** Added union variant validators ([8b9e131](https://github.com/modulify/validator/commit/8b9e131a06a87e9bf462c492cbf8a6facacb7230))
* **combinators:** Extended fieldsMatch with nested selectors ([af5801e](https://github.com/modulify/validator/commit/af5801ed21dfa62e3f2ae88ad9e6db130ecbe293))
* Expanded metadata introspection contracts ([a188152](https://github.com/modulify/validator/commit/a1881526b2bd25d18584b478a1650a23d2a28f16))
* Injecting check utility into Assertion ([be8b22e](https://github.com/modulify/validator/commit/be8b22e23e968d39ade0198f85944b8f82e3183b))
* isObject now returns false on null values, added isShape predicate constructor for checking objects structures ([ee70741](https://github.com/modulify/validator/commit/ee70741e6f8ad4f2da0913187b1663b2dc1da6ed))
* redesign assertion API around structured violations ([acf16f3](https://github.com/modulify/validator/commit/acf16f39e26a38da944805dff8eb20ca416ad174))
* Shape object API was unified ([c43f6b6](https://github.com/modulify/validator/commit/c43f6b61b3cacf33fca224c9f4ef93c794145028))
* **types:** Added code-aware violation inference ([f9851db](https://github.com/modulify/validator/commit/f9851db28ac663a59a07fb6ca8396910a20929eb))
* Validation API was redesigned around typed tuples ([d645441](https://github.com/modulify/validator/commit/d6454412b6ac514ff3c31cce6641fabe11c844c3))

## [0.1.0](https://github.com/modulify/validator/compare/v0.0.2...v0.1.0) (2024-12-22)


### ⚠ BREAKING CHANGES

* validator object replaced with validate function, containing sub method sync for synchronous validation
* Length constraint replaced with HasLength functional assertion
* Exists constraint replaced with IsDefined functional assertion
* Each object replaced with Each runner
* Collection object replaced with HasProperties runner
* Type "Key" replaced with in-box "PropertyKey"
* ConstraintCollection type was removed
* ConstraintValidator was renamed to Validator
* ConstraintViolation was renamed to Violation
* d.ts files for exported logic units are now generated and available in dist catalogue

### Features

* Logic redesign and simplification ([b829a1e](https://github.com/modulify/validator/commit/b829a1eb0373cc6069451eb1cdf4767accbe2ee3))


### Fixes

* Removed sourcemap ([7e469d0](https://github.com/modulify/validator/commit/7e469d0ca60d854c62a79c54e9b3dba1d3b72657))
* test coverage ([84912c4](https://github.com/modulify/validator/commit/84912c4a33d58b385a1e0c764c57b3806d658613))

### [0.0.2](https://github.com/modulify/validator/compare/v0.0.1...v0.0.2) (2024-02-05)

### 0.0.1 (2024-02-05)


### Features

* Added constraint Each to apply constraints to array entries ([eb0f44f](https://github.com/modulify/validator/commit/eb0f44f722cfbae7493e23b71ef92ddcc3655228))
* Added exported by src/index.ts members to types/index.d.ts ([cce525b](https://github.com/modulify/validator/commit/cce525bc8c893e4c3c3b6eec6ddcaa7d901aa948))
* Added Length / OneOf constraint to exported by src/index.ts members ([c152199](https://github.com/modulify/validator/commit/c152199bc470a3b3746b8f2f376063457b86728a))
* Added meta to ConstraintViolation ([11b9bf0](https://github.com/modulify/validator/commit/11b9bf0df520d7b427b3a6eb19dc8f3ada12cbd8))
* Added meta to OneOf violation ([8dd59fc](https://github.com/modulify/validator/commit/8dd59fc2663df1e791ad95449ba774374b6e0bf8))
* Added possibility to override initial valitators set ([0192f44](https://github.com/modulify/validator/commit/0192f44e4e9e487cbc1230cd588ea62d926e7143))
* Asynchronous validation ([1505f41](https://github.com/modulify/validator/commit/1505f417bd869ba762f6a91d1d30a360d2505ad4))
