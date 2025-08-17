# Task Completion Checklist

When completing any coding task in this project, ensure the following steps are
performed:

## 1. Code Quality Checks

Run the comprehensive quality check command:

```bash
deno task check
```

This runs:

- `deno fmt --check` - Format checking
- `deno lint` - Code linting
- `deno check --allow-import --unstable-kv **/*.ts` - TypeScript type checking
  for .ts files
- `deno check --allow-import --unstable-kv **/*.tsx` - TypeScript type checking
  for .tsx files

## 2. Individual Quality Tools (if needed)

```bash
# Fix formatting issues
deno fmt

# Check for lint issues
deno lint

# Type check specific files
deno check --allow-import --unstable-kv path/to/file.ts
```

## 3. Testing (Manual)

Since there are no automated tests configured:

- Test the development server: `deno task start`
- Verify functionality through the web interface at http://localhost:8000
- Test optimization functionality with Japanese text input
- Verify KV dictionary operations if modified

## 4. Git Hooks Verification

The lefthook configuration will automatically run quality checks on commit:

- Lint, format, and type-check will run on staged files
- Full `deno task check` runs on push
- Ensure all hooks pass before committing

## 5. Dependencies Check

- Verify all imports are properly configured in `deno.json`
- Ensure no new dependencies are added without proper import map entries
- Check that KV operations use `--unstable-kv` flag where needed

## 6. Fresh Framework Specific

- Regenerate manifest if routes changed: `deno task manifest`
- Verify islands work properly in client-side context
- Test both development (`deno task start`) and production
  (`deno task build && deno task preview`) modes

## 7. KV Dictionary Operations

If KV-related code was modified:

- Test dictionary initialization: `deno run -A --unstable-kv scripts/init-kv.ts`
- For remote testing: `deno run -A --unstable-kv scripts/init-kv.ts --remote`
- Verify synonym lookup functionality
- Check cron job logic for dictionary updates

## 8. Unified KV Script

The project now uses a single unified script for both local and remote KV
initialization:

- Local: `deno run -A --unstable-kv scripts/init-kv.ts`
- Remote: `deno run -A --unstable-kv scripts/init-kv.ts --remote`
- This prevents the synchronization issues that led to Issue #1
