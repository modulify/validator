# Releasing @modulify/validator

Use Node.js 22.14+ or 24+ and the Yarn version pinned in `package.json`.
Install dependencies with `yarn install --immutable`.

The repository uses `@modulify/conventional-release` to calculate the version,
update `package.json` and `CHANGELOG.md`, and create a release commit with an
annotated `v<version>` tag. npm publication and GitHub Releases belong to CI.

Preview a release without changing files, commits, or tags:

```sh
yarn release:dry
yarn release:dry --prerelease rc
yarn release:dry --release-as minor
```

Automatic version recommendations below 1.0 follow pre-major semantics:
breaking changes advance the minor version; features and fixes advance the patch.
Explicit `--release-as major` produces 1.0.0. Release configuration lives in
`release.config.mjs`; dependencies are installed before releasing, so the version
bump does not rerun installation or update the lockfile.

## GitHub Actions

Start the `Release` workflow manually:

- `release`: `auto`, `patch`, `minor`, or `major`;
- `prerelease`: `none`, `alpha`, `beta`, or `rc`;
- `npm_tag`: `auto` selects `latest` for stable releases and the prerelease channel
  otherwise; an explicit dist-tag can override it.

Stable releases run only from `main`. Prereleases may run from other branches,
but cannot publish to `latest`. Releases are serialized across branches.

CI runs lint, strict type checks, runtime and type tests, and packed consumer
checks before creating the release. It atomically pushes the release commit and
its tag. A separate job checks out that exact tag, repeats the checks, builds the
package, and publishes through npm OIDC. A GitHub Release is created after npm
publication succeeds; prereleases are marked accordingly.

If publication or GitHub Release creation fails after the tag was pushed, use
GitHub Actions **Re-run failed jobs** on the original run. Publication checks the
registry for the exact version and skips a version already published. Registry
lookup errors stop the job. Starting a new workflow run prepares another release.

## npm Trusted Publisher

The package already has this trusted publisher configured (verified 2026-09-26):

| Field | Value |
| --- | --- |
| Provider | GitHub Actions |
| Organization | `modulify` |
| Repository | `validator` |
| Workflow filename | `release.yml` |
| Allowed actions | `npm publish`, `npm stage publish` |

Keep the workflow filename aligned with this package-level configuration.
The publishing job uses a GitHub-hosted runner, Node.js 24, npm 11.5.1 or newer,
and `id-token: write`. No `NPM_TOKEN` or `NODE_AUTH_TOKEN` secret is used for
publication. npm generates provenance automatically for this public package
and repository. See [npm Trusted Publishing](https://docs.npmjs.com/trusted-publishers/).

A local authenticated npm session is separate from CI OIDC. Release previews
and repository-local versioning do not require npm authentication.
