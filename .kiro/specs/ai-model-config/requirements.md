# Requirements Document

## Introduction

This feature extends the environment-variable-based AI model configuration pattern (already used by the Ad Copy feature via `AD_COPY_MODEL`) to the remaining two AI-powered features: Message Response Suggestions and Area Insights. Each feature will read its model identifier from a dedicated environment variable at runtime, defaulting to `gpt-4o-mini` when the variable is not set. This allows operators to swap models (e.g., upgrade to `gpt-4o`, switch to a fine-tuned variant) without code changes or redeployment.

## Glossary

- **Suggestion_Engine**: The server-side module (`lib/ai/suggestion-engine.ts`) that generates AI-powered reply suggestions for messaging conversations.
- **Insights_Generator**: The server-side module (`lib/insights/generate.ts`) that generates area insights, talking points, and seller pitch content for property listings.
- **Model_Identifier**: A string value representing an OpenAI model name (e.g., `gpt-4o-mini`, `gpt-4o`, `gpt-4-turbo`).
- **Environment_Variable**: A server-side runtime configuration value read from `process.env`.
- **SUGGESTION_MODEL**: The environment variable that controls which OpenAI model the Suggestion_Engine uses.
- **INSIGHTS_MODEL**: The environment variable that controls which OpenAI model the Insights_Generator uses.
- **Default_Model**: The fallback model identifier (`gpt-4o-mini`) used when the corresponding environment variable is not set or is empty.

## Requirements

### Requirement 1: Suggestion Engine Model Configuration

**User Story:** As a system operator, I want to configure the AI model used by the Message Response Suggestions feature via an environment variable, so that I can upgrade or change models without modifying code.

#### Acceptance Criteria

1. WHEN the `SUGGESTION_MODEL` environment variable is set to a non-empty, non-whitespace value, THE Suggestion_Engine SHALL use that trimmed value as the Model_Identifier for OpenAI API calls.
2. IF the `SUGGESTION_MODEL` environment variable is not set, is empty, or contains only whitespace, THEN THE Suggestion_Engine SHALL use `gpt-4o-mini` as the Default_Model.
3. THE Suggestion_Engine SHALL read the `SUGGESTION_MODEL` environment variable once at application startup and use the resolved Model_Identifier for all subsequent OpenAI API calls until the application is restarted.
4. THE Suggestion_Engine SHALL pass the resolved Model_Identifier to the OpenAI chat completions API in the `model` field of the request.
5. IF the OpenAI API returns a 404 error indicating an invalid model, THEN THE Suggestion_Engine SHALL log the error including the Model_Identifier that was used and return an empty suggestions array.

### Requirement 2: Insights Generator Model Configuration

**User Story:** As a system operator, I want to configure the AI model used by the Area Insights feature via an environment variable, so that I can upgrade or change models without modifying code.

#### Acceptance Criteria

1. WHEN the `INSIGHTS_MODEL` environment variable is set to a non-empty, non-whitespace value (maximum 100 characters), THE Insights_Generator SHALL use that trimmed value as the Model_Identifier for OpenAI API calls.
2. WHEN the `INSIGHTS_MODEL` environment variable is not set, is empty, or contains only whitespace characters, THE Insights_Generator SHALL use `gpt-4o-mini` as the Default_Model.
3. THE Insights_Generator SHALL read the `INSIGHTS_MODEL` environment variable at the time of each API request, so that changes to the variable take effect without restarting the application.
4. THE Insights_Generator SHALL pass the resolved Model_Identifier to the OpenAI chat completions API in the `model` field of the request body.
5. IF the OpenAI API returns a non-success status code, THEN THE Insights_Generator SHALL log the error including the HTTP status code and the Model_Identifier that was used, and return template-based content generation output to the caller.

### Requirement 3: Environment Variable Documentation

**User Story:** As a developer setting up the application, I want the new environment variables documented in the example env file, so that I know what configuration options are available.

#### Acceptance Criteria

1. THE `.env.example` file SHALL include entries for `SUGGESTION_MODEL` and `INSIGHTS_MODEL` placed within the existing "AI" comment section, each preceded by a comment line stating the variable's purpose: `SUGGESTION_MODEL` controls the LLM model used for reply suggestion generation, and `INSIGHTS_MODEL` controls the LLM model used for area insight generation.
2. THE `.env.example` file SHALL show the default value `gpt-4o-mini` as a commented-out assignment (e.g., `# SUGGESTION_MODEL=gpt-4o-mini`) for each new variable, following the same formatting conventions as existing entries in the file.
3. THE `.env.example` file SHALL preserve all existing environment variable entries unchanged when the new entries are added.

### Requirement 4: Consistent Pattern Across AI Features

**User Story:** As a developer maintaining the codebase, I want all AI features to follow the same model configuration pattern, so that the system is predictable and easy to maintain.

#### Acceptance Criteria

1. THE Suggestion_Engine SHALL resolve the model identifier by reading the `SUGGESTION_MODEL` environment variable and falling back to a `DEFAULT_MODEL` constant set to `gpt-4o-mini` when the variable is not set or is empty after trimming.
2. THE Insights_Generator SHALL resolve the model identifier by reading the `INSIGHTS_MODEL` environment variable and falling back to a `DEFAULT_MODEL` constant set to `gpt-4o-mini` when the variable is not set or is empty after trimming.
3. WHEN the `SUGGESTION_MODEL` environment variable is set, THE Suggestion_Engine SHALL remove leading and trailing whitespace from the value before using it as the Model_Identifier.
4. WHEN the `INSIGHTS_MODEL` environment variable is set, THE Insights_Generator SHALL remove leading and trailing whitespace from the value before using it as the Model_Identifier.
5. IF the `SUGGESTION_MODEL` or `INSIGHTS_MODEL` environment variable contains only whitespace characters, THEN THE respective module SHALL treat the value as empty and fall back to the `DEFAULT_MODEL` constant.
