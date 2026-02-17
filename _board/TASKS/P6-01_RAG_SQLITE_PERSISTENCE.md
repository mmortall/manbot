# Task: P6-01 SQLite Persistence for RAG Service

## Description
Update the `RAGService` to use `SQLite` for persistent embedding storage instead of in-memory array.

## Requirements
- Create a `rag_documents` table in a new or existing SQLite database.
- Column `id` (UUID), `content` (TEXT), `metadata` (TEXT/JSON), `embedding` (BLOB/BINARY).
- Implement `addDocument` to insert into SQLite.
- Implement `search` to load and score from SQLite (or use vector extension if available, otherwise manual dot product on loaded vectors).
- Ensure DB path is configurable via `config.json`.

## Definition of Done
- `RAGService` persists documents across process restarts.
- Unit tests verify retrieval of previously stored documents.
