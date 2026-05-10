# Implementation Plan: AI Model Configuration

## Overview

Extend the environment-variable-based AI model configuration pattern to the Suggestion Engine and Insights Generator modules. Each module gains a model resolution step (env var → trim → fallback to `gpt-4o-mini`), with the Suggestion Engine resolving once at module load and the Insights Generator resolving per-request. The `.env.example` file is updated to document the new variables.

## Tasks

- [x] 1. Implement Suggestion Engine model configuration
  - [x] 1.1 Add model resolution constant and update `callOpenAI` in `suggestion-engine.ts`
    - Add `DEFAULT_MODEL` constant set to `'gpt-4o-mini'` at module top level
    - Add `SUGGESTION_MODEL` constant: `(process.env.SUGGESTION_MODEL ?? '').trim() || DEFAULT_MODEL`
    - Replace hardcoded `'gpt-4o-mini'` in `openai.chat.completions.create()` with `SUGGESTION_MODEL`
    - Enhance error logging in the catch block to include the model identifier used
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 4.1, 4.3, 4.5_

  - [x] 1.2 Write property tests for model resolution logic
    - Create `apps/web/src/lib/ai/__tests__/model-resolution.property.test.ts`
    - **Property 1: Non-whitespace values resolve to trimmed input**
    - **Property 2: Whitespace-only and empty values resolve to default**
    - **Property 3: Resolution is idempotent**
    - **Validates: Requirements 1.1, 1.2, 2.1, 2.2, 4.1, 4.2, 4.3, 4.4, 4.5**

  - [x] 1.3 Write unit tests for Suggestion Engine model configuration
    - Create `apps/web/src/lib/ai/__tests__/suggestion-engine-model.test.ts`
    - Test that module-level constant is used (env var change after import has no effect)
    - Test that resolved model is passed in OpenAI request `model` field
    - Test that OpenAI 404 returns empty array and logs model name
    - _Requirements: 1.3, 1.4, 1.5_

- [x] 2. Implement Insights Generator model configuration
  - [x] 2.1 Add per-request model resolution in `generateLLMContent` in `generate.ts`
    - Add `DEFAULT_MODEL` constant set to `'gpt-4o-mini'` at module top level
    - Inside `generateLLMContent()`, resolve model: `const model = (process.env.INSIGHTS_MODEL ?? '').trim() || DEFAULT_MODEL`
    - Replace hardcoded `'gpt-4o-mini'` in the `fetch` request body with the resolved `model` variable
    - Update error log to include model identifier: `console.error('[Insights] OpenAI error:', res.status, 'model:', model)`
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 4.2, 4.4, 4.5_

  - [x] 2.2 Write unit tests for Insights Generator model configuration
    - Create `apps/web/src/lib/insights/__tests__/insights-model.test.ts`
    - Test that env var is re-read on each call (change between calls takes effect)
    - Test that resolved model is passed in fetch request body `model` field
    - Test that non-200 response returns template fallback and logs status + model
    - _Requirements: 2.3, 2.4, 2.5_

- [x] 3. Checkpoint
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Update environment variable documentation
  - [x] 4.1 Add `SUGGESTION_MODEL` and `INSIGHTS_MODEL` entries to `.env.example`
    - Place entries within the existing "AI" comment section, after `OPENAI_API_KEY`
    - Add comment line for each: purpose description matching requirements
    - Show default value as commented-out assignment (e.g., `# SUGGESTION_MODEL=gpt-4o-mini`)
    - Preserve all existing entries unchanged
    - _Requirements: 3.1, 3.2, 3.3_

- [x] 5. Final checkpoint
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- The Suggestion Engine resolves the model once at module load (module-level constant)
- The Insights Generator resolves the model per-request (inside `generateLLMContent`)
- Property tests use `fast-check` following the existing project pattern (see `greeting-detection.property.test.ts`)
- Both modules share the same resolution logic: `(process.env.VAR ?? '').trim() || DEFAULT_MODEL`

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "2.1", "4.1"] },
    { "id": 1, "tasks": ["1.2", "1.3", "2.2"] }
  ]
}
```
