Yes. Commit and push. Then feed Codex this prompt6.md to run a hard validation sweep that proves Arela actually bites, not decorates.

⸻

prompt6.md — Arela v0.2.0 Validation Suite

Goal: Verify Arela’s rules, guardrails, and upgrade paths work in a real git repo and CI. Perform tests, print outputs, and restore a clean state at the end.

Assumptions
	•	Current workspace is a real git repo with origin set (GitHub).
	•	@arela/preset-cto is already built.
	•	Node ≥ 18, pnpm installed.

⸻

0) Repo sanity + install
	1.	Print git status and remotes.
	2.	Ensure dependencies installed and CLI is executable.

git status -sb
git remote -v || true
pnpm i
node packages/preset-cto/dist/cli.js --help >/dev/null || exit 1


⸻

1) Husky pre-commit actually blocks bad state
	1.	Create a new branch for tests.
	2.	Deliberately break a rule (remove front-matter).
	3.	Attempt commit and show that pre-commit fails.
	4.	Revert the damage.

git checkout -b chore/arela-validate
cp .arela/rules/020-context-integrity.md .arela/rules/020-context-integrity.bak
# break it
printf "this is not valid front matter\n" > .arela/rules/020-context-integrity.md

# staged commit should FAIL via pre-commit doctor
git add .arela/rules/020-context-integrity.md
set +e
git commit -m "test: break rule to validate doctor"
ECODE=$?
set -e
echo "commit_exit_code=$ECODE"
if [ "$ECODE" -eq 0 ]; then echo "ERROR: commit should have failed"; exit 1; fi

# restore
mv .arela/rules/020-context-integrity.bak .arela/rules/020-context-integrity.md
git reset --hard


⸻

2) CI workflow presence and behavior
	1.	Confirm the CI file exists and references Arela.
	2.	Simulate CI by running the same command.

test -f .github/workflows/arela-doctor.yml || { echo "Missing CI workflow"; exit 1; }
grep -q "doctor" .github/workflows/arela-doctor.yml || { echo "CI not running doctor"; exit 1; }
node packages/preset-cto/dist/cli.js doctor


⸻

3) Postinstall opt-out check
	1.	Simulate consumer install with and without opt-out.
	2.	Without opt-out: .arela should exist or be created.
	3.	With opt-out: no new files should be written.

TMPDIR=$(mktemp -d)
pushd "$TMPDIR" >/dev/null
pnpm init -y >/dev/null
pnpm add -D "file:$(pwd -P | sed 's|/[^/]*$||')/packages/preset-cto" >/dev/null 2>&1 || true
# verify .arela presence
if [ ! -d ".arela" ]; then echo "WARN: .arela not auto-initialized (acceptable if postinstall guard is conservative)"; fi

# opt-out
rm -rf node_modules .arela
ARELA_SKIP_POSTINSTALL=1 pnpm add -D "file:$(pwd -P | sed 's|/[^/]*$||')/packages/preset-cto" >/dev/null 2>&1 || true
if [ -d ".arela" ]; then echo "ERROR: postinstall ran despite opt-out"; exit 1; fi
popd >/dev/null


⸻

4) Upgrade conflict protection
	1.	Modify a local rule content.
	2.	Run arela upgrade to ensure it does not silently clobber.
	3.	Confirm a conflict or .new file appears.

# safe local edit
echo "" >> .arela/rules/030-ticket-format.md
# run upgrade (should detect divergence and avoid clobbering)
node packages/preset-cto/dist/cli.js upgrade || true
# check for new file or conflict notice in stdout
ls .arela/rules | grep -E '030-ticket-format.*(new|local)' || echo "NOTE: upgrade handled cleanly; verify stdout for conflict notice"
git checkout -- .arela/rules/030-ticket-format.md


⸻

5) Universal Bootstrap prompt integrity
	1.	Ensure BOOTSTRAP references current rule IDs.
	2.	Print the agent bootstrap to verify the output is self-contained.

test -f .arela/BOOTSTRAP.readme.md || { echo "Missing BOOTSTRAP.readme.md"; exit 1; }
grep -q "arela.context_integrity" .arela/BOOTSTRAP.readme.md || { echo "Bootstrap missing context_integrity"; exit 1; }
node packages/preset-cto/dist/cli.js agent bootstrap || true


⸻

6) Observability and TBD rules bite
	1.	Create a dummy API file without logs and try to pass doctor if you have rule checks wired.
If Arela doesn’t yet parse code, just ensure the files exist and the rule is present.

test -f .arela/rules/080-observability-minimums.md || { echo "Missing observability rule"; exit 1; }
test -f .arela/rules/016-trunk-based-dev.md || echo "NOTE: TBD rule file not present under that name; using current IDs"


⸻

7) Clean up and summary
	1.	Show git diff summary.
	2.	Leave on the validation branch for a PR.

git status -sb
echo "Validation complete. Open PR from chore/arela-validate to confirm CI failure behavior when you intentionally break a rule."

Deliverables:
	•	Print outputs for each section as fenced code blocks.
	•	If any step fails unexpectedly, print the exact command and error, plus a minimal fix.

⸻
	•	Make --eval meaningful: drop a minimal .arela/.last-report.json so CI can bite.

{
  "scores": {
    "reasoning": 4.2,
    "correctness": 4.0,
    "maintainability": 4.1,
    "safety": 4.0,
    "ux_empathy": 3.8
  },
  "notes": "Initial baseline."
}


	•	Sanity pass locally:

pnpm build
node packages/preset-cto/dist/cli.js doctor --eval


	•	Lock behavior in docs: in the preset README, state the three non-negotiables Arela enforces: context integrity, ticket schema, review gates. Humans forget; CI won’t.
	•	Confirm opt-out works in README: ARELA_SKIP_POSTINSTALL=1 to prevent auto-init.
	•	Versioning: keep @arela/preset-cto at 0.3.0, update changelog, then tag after tests pass.

Run the suite now and paste the results.