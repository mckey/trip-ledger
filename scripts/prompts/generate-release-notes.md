You are generating release notes for the next version of trip-ledger. The
project keeps its changelog in `CHANGELOG.md` (repository root) following the
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) convention with
`### Added / Changed / Fixed / Removed` sections.

## Workflow

1. **Read `CHANGELOG.md`** to learn the existing style and to find the most
   recently released version. The latest released version is the highest
   version under a dated `## [X.Y.Z] - YYYY-MM-DD` heading — ignore the
   `## [Unreleased]` entry, which is what you will be filling in.
2. **Run `git log <latest-tag>..HEAD --oneline --no-merges`** to list every
   commit added since that release. The tag name matches the version with a
   leading `v` (e.g. `v0.1.0` for `[0.1.0]`).
3. **Read `SPEC.md`** for project context — tone and terminology to match.
4. **Categorize each commit** into one of the four sections by its
   conventional-commit prefix:
   - `feat:` → **Added**
   - `fix:` → **Fixed**
   - `refactor:` / `chore:` / `perf:` / `style:` / `test:` → **Changed**
   - explicit removals → **Removed**
   Rewrite each commit subject as a short, user-facing bullet (drop the
   prefix and make it readable to a non-engineer).
5. **Edit `CHANGELOG.md`**: fill the empty `## [Unreleased]` section with a
   new dated `## [X.Y.Z] - YYYY-MM-DD` release right below it. Keep the
   `## [Unreleased]` heading itself on top.
6. (Optional) **Re-read `CHANGELOG.md`** to confirm the edit applied cleanly.

## Constraints

- **Do not commit or push.** Edits stay in the working tree as a suggestion;
  a human reviewer applies them.
- **Do not edit anything except `CHANGELOG.md`.**
- Each bullet must be one line, no trailing period.
- Use exactly these section titles: `Added`, `Changed`, `Fixed`, `Removed`.
  Skip any section that has no entries.
- Match the formatting of the existing `[0.1.0]` entry (blank line after
  each `###` heading, `-` bullets).

## Final output

Return a JSON object describing what you wrote, matching the requested
schema. The fields:

- `version`: the next semver bump you'd suggest, based on the commit mix.
  Any `feat:` since the last tag → minor bump; otherwise patch. Format
  `"X.Y.Z"`, no leading `v`.
- `release_date`: today's date as `YYYY-MM-DD`.
- `sections`: array of `{title, items[]}` matching the categorized bullets,
  in the order `Added → Changed → Fixed → Removed` (omit empty ones).

The JSON must mirror the bullets you wrote into the CHANGELOG. A reviewer
will diff them — they must agree.
