# Japanese Token Compressor Project Overview

## Purpose

This is a web application built with Deno + Fresh + Deno KV that optimizes
Japanese text for token efficiency. It analyzes Japanese text and uses the
Sudachi synonym dictionary along with actual token count measurement to
automatically convert text to more efficient Japanese expressions while
maintaining readability.

## Core Features

- Japanese text input and editing
- Real-time optimization processing
- Token count comparison display
- One-click copy of optimization results
- Responsive UI
- High-speed KV storage dictionary management
- Daily automatic dictionary updates via Deno Cron

## Technology Stack

- **Runtime**: Deno 2.0+
- **Framework**: Fresh (Deno-based web framework)
- **Storage**: Deno KV (Key-Value storage)
- **Scheduling**: Deno Cron
- **Frontend**: Preact + TailwindCSS
- **Tokenization**: js-tiktoken (GPT-4o compatible, o200k_base)
- **Japanese Analysis**: wakachigaki (morphological analysis)
- **Dictionary**: Sudachi synonym dictionary (15,085 synonym mappings + 64,747
  dictionary words)

## Optimization Engine

1. **Morphological Analysis**: wakachigaki splits Japanese text into words
2. **Synonym Search**: Gets synonym candidates from Sudachi dictionary for each
   word
3. **Token Efficiency Evaluation**: Measures actual token count for each
   candidate using js-tiktoken
4. **Optimal Replacement**: Replaces with the most token-efficient words
5. **Result Display**: Shows comparison of original and optimized text with
   token counts

## Deployment

- Designed for Deno Deploy
- Automatic dictionary updates via Deno Cron (daily at 2:00 AM JST)
- Remote KV access via DENO_KV_ACCESS_TOKEN
