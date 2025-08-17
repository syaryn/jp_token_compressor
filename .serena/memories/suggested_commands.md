# Suggested Commands

## Development Commands

```bash
# Start development server with hot reload
deno task start

# Initialize KV dictionary (local - required on first setup)
deno run -A --unstable-kv scripts/init-kv.ts

# Initialize KV dictionary (remote - for Deno Deploy)
deno run -A --unstable-kv scripts/init-kv.ts --remote

# Build for production
deno task build

# Run production server
deno task preview

# Update Fresh framework
deno task update
```

## Code Quality Commands

```bash
# Run all quality checks (lint + format + type-check)
deno task check

# Format code
deno fmt

# Lint code  
deno lint

# Type check
deno check --allow-import --unstable-kv **/*.ts
deno check --allow-import --unstable-kv **/*.tsx
```

## Deployment Commands

```bash
# Deploy to Deno Deploy
deployctl deploy --project=your-project main.ts

# Initialize remote KV dictionary (for production)
export DENO_KV_ACCESS_TOKEN="your_access_token_here"
deno run -A --unstable-kv scripts/init-kv.ts --remote
```

## Git Hooks (Automated via lefthook)

The following commands run automatically on git commits:

- `deno lint {staged_files}` - Lint staged files
- `deno fmt {staged_files}` - Format staged files
- `deno check --allow-import {staged_files}` - Type check staged files

On git push:

- `deno task check` - Full quality check

## Environment Setup

```bash
# Set KV access token for remote deployment
export DENO_KV_ACCESS_TOKEN="your_access_token_here"
```

## Useful System Commands

- `ls` - List files
- `cd` - Change directory
- `git status` - Check git status
- `git add` - Stage files
- `git commit` - Commit changes
- `grep` or `rg` - Search in files
