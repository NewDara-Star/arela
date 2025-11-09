# @arela/preset-cto

Arela packages a curated set of CTO-level rules, workflows, and memories that keep projects aligned.
Use the `arela` CLI to bootstrap a `.arela/` folder, sync templates, run upgrades, and audit content.

### Install
```bash
pnpm add -D @newdara/preset-cto
npx arela init
npx arela harden
npx arela agent bootstrap   # paste into your agent’s system prompt
npx arela doctor --eval
```

### Non-Negotiables

Arela enforces three guardrails on every run and fails CI if they drift:
- Context integrity (`arela.context_integrity`) to ensure every prompt ships with valid front-matter.
- Ticket schema (`arela.ticket_format`) so every change request links back to real work.
- Review gates (`arela.code_review_gates`) that block merges without dual sign-off.

### Postinstall Opt-Out

The preset auto-initializes `.arela/` during `pnpm i`. When bootstrapping tooling or vendoring the preset,
skip that behavior by exporting `ARELA_SKIP_POSTINSTALL=1 pnpm add -D @arela/preset-cto`.

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
