name: Arela Doctor
on: [pull_request]

jobs:
  doctor:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - run: pnpm i

      # Build the CLI from source for monorepo use
      - name: Build Arela CLI
        run: pnpm -F @arela/preset-cto build

      - name: Run Arela Doctor
        run: |
          set -e
          if [ -f node_modules/@arela/preset-cto/dist/cli.js ]; then
            node node_modules/@arela/preset-cto/dist/cli.js doctor --eval
          else
            node packages/preset-cto/dist/cli.js doctor --eval
          fi


Open .github/workflows/arela-doctor.yml and replace the doctor step with the YAML above, then commit with message ci: build CLI and add monorepo fallback path for Arela doctor.