/** @type {import('@modulify/conventional-release').Options} */
export default {
  mode: 'sync',
  tagPrefix: 'v',
  commitMessage: ({ tag }) => `chore: Released ${tag}`,
  // Only the root version changes; the dependency graph and lockfile stay intact.
  install: false,
}
