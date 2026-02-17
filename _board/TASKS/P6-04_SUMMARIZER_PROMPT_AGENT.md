# Task: P6-04 Specialized Summarizer Prompt and Node

## Description
Create a specialized system prompt and capability node for extracting "persistent memory" from chat history.

## Requirements
- Create `src/agents/prompts/summarizer.ts` with a prompt focused on:
    - Identifying user names and nicknames.
    - Identifying user preferences (e.g., "I like Python").
    - Identifying key entities and project context.
    - Formatting as a structured list or concise summary.
- Update `GeneratorService` to support a `summarize` type or use the new prompt in `Planner`.

## Definition of Done
- A dedicated prompt exists for memory extraction.
- The prompt successfully extracts entities and preferences from a sample chat log.
