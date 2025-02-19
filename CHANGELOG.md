# Changelog

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

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
