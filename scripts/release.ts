// Makes a new release: bumps the version in package.json, asks Claude Code to write release notes
// from the commits since the last tag, then commits, tags and pushes. The tag push starts
// .github/workflows/release.yml, which builds the zip and makes the GitHub release.
// Run: bun run release patch|minor|major
import { $ } from 'bun'
import { tmpdir } from 'node:os'

const BUMPS = ['patch', 'minor', 'major']

function fail(message: string): never {
  console.error(message)
  process.exit(1)
}

const bump = process.argv[2] ?? ''
if (!BUMPS.includes(bump)) fail('Usage: bun run release patch|minor|major')

if ((await $`git status --porcelain`.text()).trim()) fail('Commit or stash your changes first.')
if ((await $`git branch --show-current`.text()).trim() !== 'main') fail('Switch to main first.')
await $`git pull --ff-only`

// Stop before anything is pushed, because a failed check in CI leaves a tag with no release.
await $`bun run typecheck`
await $`bun test`

const pkg = await Bun.file('package.json').json()
const [major = 0, minor = 0, patch = 0] = String(pkg.version).split('.').map(Number)
const version =
  bump === 'major'
    ? `${major + 1}.0.0`
    : bump === 'minor'
      ? `${major}.${minor + 1}.0`
      : `${major}.${minor}.${patch + 1}`
const tag = `v${version}`

const lastTag = await $`git describe --tags --abbrev=0`.quiet().nothrow()
const range = lastTag.exitCode === 0 ? `${lastTag.text().trim()}..HEAD` : 'HEAD'
const format = '--format=- %s%n%b'
const commits = await $`git log ${range} --no-merges ${format}`.text()

console.log(`Writing release notes for ${tag}...`)
const prompt = `Write the GitHub release notes for ${tag} of Lingomingo, a Chrome extension for learning languages with Netflix, YouTube and web pages. The git commits since the last release are on stdin.
- Write for users, not developers. Leave out refactors, tooling and other internal changes.
- Use Markdown "### Features", "### Fixes" and "### Other" sections with short bullet points. Leave out empty sections.
- Output only the notes: no title, no version, no text before or after.`
const notes = (
  await $`claude -p --tools ${''} --no-session-persistence ${prompt} < ${new Response(commits)}`.text()
).trim()
if (!notes) fail('Claude returned no release notes.')
console.log(`\n${notes}\n`)

pkg.version = version
await Bun.write('package.json', JSON.stringify(pkg, null, 2) + '\n')
const notesFile = `${tmpdir()}/lingomingo-${tag}.md`
await Bun.write(notesFile, notes + '\n')

await $`git commit -m ${`Release ${tag}`} package.json`
// verbatim: the default cleanup removes lines that start with "#", which are Markdown headings here.
await $`git tag -a ${tag} -F ${notesFile} --cleanup=verbatim`
await $`git push --atomic origin main ${tag}`

console.log(`\nPushed ${tag}. GitHub Actions now builds the zip and makes the release:`)
console.log('https://github.com/mort3za/lingomingo/actions')
