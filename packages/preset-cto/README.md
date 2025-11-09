# @arela/preset-cto

Arela packages a curated set of CTO-level rules, workflows, and memories that keep projects aligned.
Use the `arela` CLI to bootstrap a `.arela/` folder, sync templates, run upgrades, and audit content.

## Install & Use

```sh
pnpm add -D @arela/preset-cto
npx arela init
npx arela sync
npx arela upgrade
npx arela doctor
```

### Local Overrides

Drop `*.local.md` files next to preset rules or workflows to document overrides. The CLI never overwrites
those files during sync or upgrade operations.

### CI Example

```yaml
# .github/workflows/arela-doctor.yml
name: Arela Doctor
on: [pull_request]
jobs:
  doctor:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - run: pnpm i
      - run: npx arela doctor
```
