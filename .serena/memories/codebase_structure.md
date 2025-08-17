# Codebase Structure

## Project Layout

```
jp_token_compressor/
├── routes/                    # Fresh framework routes
│   ├── api/
│   │   └── optimize.ts       # Main optimization API endpoint
│   ├── index.tsx            # Main page component
│   ├── _app.tsx             # Application root
│   └── _404.tsx             # 404 error page
├── islands/                  # Client-side components
│   └── TextOptimizer.tsx    # Main client-side optimization UI
├── scripts/                  # Utility scripts
│   ├── init-kv-dict.ts      # KV dictionary initialization
│   └── init-remote-kv.ts    # Remote KV initialization for deployment
├── utils/                    # Utility modules
│   └── kv.ts               # KV storage utilities and dictionary management
├── static/                  # Static assets
├── cron.ts                  # Deno Cron definitions for daily dictionary updates
├── main.ts                  # Production server entry point
├── dev.ts                   # Development server entry point
├── deno.json               # Deno project configuration
├── lefthook.yml            # Git hooks configuration
└── fresh.config.ts         # Fresh framework configuration
```

## Key Modules

### routes/api/optimize.ts

- Main optimization API endpoint
- Contains text optimization logic
- Functions: optimizeText, optimizeCompoundWord, getTokenCount,
  checkKvDictionary

### utils/kv.ts

- KV storage management
- Dictionary operations
- Functions: getKvInstance, initializeDictionary, getSynonym, getTokenCount,
  etc.
- Types: DictionaryMetadata interface

### islands/TextOptimizer.tsx

- Client-side React component for the optimization UI
- Handles user interactions and API calls

### cron.ts

- Automatic dictionary update system
- Daily execution at 2:00 AM JST (17:00 UTC previous day)
- Functions: updateDictionary, downloadAndBuildSynonymDict,
  shouldUpdateDictionary
