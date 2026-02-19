# Changesets

Hello and welcome! This folder has changesets for this project.

## What are changesets?

A changeset is a small collection of changes that we've collected from some of your work. Changesets will eventually be used by a tool to automatically generate a CHANGELOG, and they can also be used to determine what version bump your package needs.

## When to add a changeset

- When you add a new feature (minor version bump)
- When you fix a bug (patch version bump)
- When you make a breaking change (major version bump)

## How to add a changeset

Run `pnpm changeset` (or `bun run changeset`) in your terminal and follow the prompts.

Alternatively, you can manually create a changeset file:

1. Create a new file in `.changeset/` directory
2. Name it with a descriptive name: `{description}-{id}.md`
3. Add the following content:

```markdown
---
"oh-my-lilys": major|minor|patch
---

Your description here
```

## How to publish

Run `pnpm release` (or `bun run release`) to publish a new version.
