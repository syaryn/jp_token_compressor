# Code Style and Conventions

## Language & Framework

- **TypeScript** is used throughout the project
- **Fresh framework** patterns for routing and islands architecture
- **Preact** for React-like components with JSX

## File Naming

- **Routes**: lowercase with .tsx extension (e.g., `index.tsx`, `_app.tsx`)
- **Islands**: PascalCase with .tsx extension (e.g., `TextOptimizer.tsx`)
- **Utilities**: lowercase with .ts extension (e.g., `kv.ts`)
- **Scripts**: kebab-case with .ts extension (e.g., `init-kv-dict.ts`)

## Code Formatting

- **Deno fmt** is used for automatic formatting
- **No semicolons** (Deno style)
- **Double quotes** for strings
- **2-space indentation**

## TypeScript Configuration

- **JSX**: react-jsx mode with preact as jsxImportSource
- **Strict mode**: Type checking enabled
- **Deno libraries**: deno.window, deno.unstable
- **Import maps**: Used in deno.json for dependency management

## Import Style

- **URL imports** for Deno dependencies (e.g., `$fresh/`, `$std/`)
- **npm:** prefix for Node.js packages (e.g., `npm:js-tiktoken@1.0.21`)
- **Relative imports** for local modules

## Function Conventions

- **async/await** for asynchronous operations
- **Named exports** preferred over default exports for utilities
- **TypeScript interfaces** for data structures (e.g., `DictionaryMetadata`)

## Component Structure

- **Islands architecture**: Client-side interactive components in `/islands/`
- **Server components**: Static components in `/routes/`
- **Props typing**: TypeScript interfaces for component props

## Error Handling

- **Try-catch blocks** for async operations
- **Graceful degradation** for dictionary initialization
- **Console logging** for debugging and monitoring

## Database/KV Conventions

- **KV_KEYS constant** for key naming consistency
- **Batch operations** for performance (e.g., `saveSynonymsBatch`)
- **Metadata tracking** for dictionary state management
