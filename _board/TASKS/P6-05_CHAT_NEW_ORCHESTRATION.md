# Task: P6-05 Orchestrate Conversation Archiving

## Description
Implement the logic in `Orchestrator` to handle `chat.new` and run the archiving pipeline.

## Requirements
- Listen for `chat.new` in `Orchestrator.handleCoreMessage`.
- Pipeline:
    1. Query `TaskMemory` for all tasks matching the old `conversationId`.
    2. Format the goals and results of these tasks into a text block (history).
    3. Trigger a `summarize` task (via `Planner` or a direct node execution).
    4. Store the output in `RAGService` with appropriate metadata.
- Send success message back to Telegram.

## Definition of Done
- Sending `/new` in Telegram results in an "Archived" notification.
- Logs show history being fetched and sent for summarization.
