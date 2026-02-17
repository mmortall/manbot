# Task: P6-02 Add conversation_id to TaskMemory Schema

## Description
Update the `tasks` table schema to include a `conversation_id` column to group tasks by chat session.

## Requirements
- Update `SCHEMA` in `src/services/task-memory.ts` to include `conversation_id TEXT`.
- Update `TaskCreatePayload` and `createTaskWithDag` to accept and store `conversationId`.
- Implement a query method to retrieve history by `conversation_id`.

## Definition of Done
- `tasks` table has `conversation_id` column.
- Tasks created from Telegram adapter include the session's conversation ID.
