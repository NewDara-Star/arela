# Arela Web Installer

Web interface for bootstrapping Arela rules via GitHub PR.

## Features

- **GitHub OAuth** integration
- **One-click install** - creates PR with all files
- **Agent selection** - Cursor, Windsurf, Claude, or generic
- **Zero local setup** required

## Development

```bash
pnpm install
pnpm dev
```

Visit `http://localhost:3000`

## Environment Variables

```bash
# .env.local
GITHUB_CLIENT_ID=your_client_id
GITHUB_CLIENT_SECRET=your_client_secret
NEXTAUTH_SECRET=your_secret
NEXTAUTH_URL=http://localhost:3000
```

## Deployment

Deploy to Vercel:

```bash
vercel --prod
```

## API

### POST /api/install

```json
{
  "repo": "owner/repo",
  "agent": "cursor",
  "token": "github_token"
}
```

Response:

```json
{
  "success": true,
  "message": "PR created for owner/repo"
}
```

## What It Creates

- `.arela/rules/*` - 13 engineering standards
- `.arela/workflows/*` - 4 agent prompts
- `.arela/evals/rubric.json` - Evaluation criteria
- `.arela/.last-report.json` - Baseline scores
- `.github/workflows/arela-doctor.yml` - CI enforcement
- `.husky/pre-commit` - Pre-commit validation
- `.vscode/settings.json` - IDE configuration
