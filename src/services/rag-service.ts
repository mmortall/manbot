/**
 * RAG Service: semantic memory via embeddings and similarity search.
 * Uses Ollama for embeddings; SQLite for persistent embedding storage.
 * P4-03: _board/TASKS/P4-03_RAG_SERVICE.md
 * P6-01: _board/TASKS/P6-01_RAG_SQLITE_PERSISTENCE.md
 */

import { randomUUID } from "node:crypto";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import Database from "better-sqlite3";
import { BaseProcess } from "../shared/base-process.js";
import type { Envelope } from "../shared/protocol.js";
import { PROTOCOL_VERSION } from "../shared/protocol.js";
import { responsePayloadSchema } from "../shared/protocol.js";
import { getConfig } from "../shared/config.js";
import { OllamaAdapter } from "./ollama-adapter.js";

const PROCESS_NAME = "rag-service";

const RAG_SCHEMA = `
CREATE TABLE IF NOT EXISTS rag_documents (
  id TEXT PRIMARY KEY,
  content TEXT NOT NULL,
  metadata TEXT NOT NULL,
  embedding BLOB NOT NULL
);
`;

function embeddingToBuffer(embedding: number[]): Buffer {
  const f64 = new Float64Array(embedding);
  return Buffer.from(f64.buffer, f64.byteOffset, f64.byteLength);
}

function bufferToEmbedding(buf: Buffer): number[] {
  const f64 = new Float64Array(buf.buffer, buf.byteOffset, buf.byteLength / 8);
  return Array.from(f64);
}

/** SQLite-backed store for RAG documents. */
export class RAGStore {
  private db: Database.Database;

  constructor(dbPath: string) {
    mkdirSync(dirname(dbPath), { recursive: true });
    this.db = new Database(dbPath);
    this.db.exec(RAG_SCHEMA);
  }

  close(): void {
    this.db.close();
  }

  insert(id: string, content: string, metadata: Record<string, unknown>, embedding: number[]): void {
    const metaJson = JSON.stringify(metadata);
    const blob = embeddingToBuffer(embedding);
    this.db
      .prepare(
        `INSERT INTO rag_documents (id, content, metadata, embedding) VALUES (?, ?, ?, ?)`,
      )
      .run(id, content, metaJson, blob);
  }

  search(queryEmbedding: number[], limit: number): Array<{ content: string; metadata: Record<string, unknown>; score: number }> {
    const rows = this.db.prepare(`SELECT id, content, metadata, embedding FROM rag_documents`).all() as Array<{
      id: string;
      content: string;
      metadata: string;
      embedding: Buffer;
    }>;
    if (rows.length === 0) return [];
    const scored = rows.map((row) => {
      const embedding = bufferToEmbedding(row.embedding);
      const score = dotProduct(queryEmbedding, embedding);
      const metadata = (JSON.parse(row.metadata || "{}") ?? {}) as Record<string, unknown>;
      return { content: row.content, metadata, score };
    });
    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, limit);
  }
}

interface MemorySearchPayload {
  query: string;
  limit?: number;
}

interface MemoryInsertPayload {
  content: string;
  metadata?: Record<string, unknown>;
}

export class RAGService extends BaseProcess {
  private readonly ollama: OllamaAdapter;
  private readonly embedModel: string;
  private readonly store: RAGStore;

  constructor(options?: { ollama?: OllamaAdapter; embedModel?: string; dbPath?: string }) {
    super({ processName: PROCESS_NAME });
    this.ollama = options?.ollama ?? new OllamaAdapter();
    this.embedModel = options?.embedModel ?? getConfig().rag.embedModel;
    const dbPath = options?.dbPath ?? getConfig().rag.dbPath;
    this.store = new RAGStore(dbPath);
  }

  /** Embed and store a document */
  async addDocument(content: string, metadata: Record<string, unknown> = {}): Promise<string> {
    const { embedding } = await this.ollama.embed(content, this.embedModel);
    const id = randomUUID();
    this.store.insert(id, content, metadata, embedding);
    return id;
  }

  /** Return relevant snippets by semantic similarity (cosine via dot product for L2-normalized vectors) */
  async search(query: string, limit = 5): Promise<Array<{ content: string; metadata: Record<string, unknown>; score: number }>> {
    const { embedding: queryEmbed } = await this.ollama.embed(query, this.embedModel);
    return this.store.search(queryEmbed, limit);
  }

  protected override handleEnvelope(envelope: Envelope): void {
    if (envelope.to !== PROCESS_NAME) return;
    const type = envelope.type;
    const payload = envelope.payload as Record<string, unknown>;

    if (type === "node.execute") {
      const p = payload as { type?: string; input?: Record<string, unknown> };
      if (p.type !== "semantic_search") return;
      const query = (p.input?.query ?? "") as string;
      const limit = (typeof p.input?.limit === "number" ? p.input.limit : 5) as number;
      this.search(query, limit).then((results) => {
        this.sendResponse(envelope, { results, snippets: results.map((r) => r.content) });
      }).catch((err) => {
        this.sendError(envelope, "RAG_SEARCH_ERROR", err instanceof Error ? err.message : String(err));
      });
      return;
    }

    if (type === "memory.semantic.insert") {
      const p = payload as unknown as MemoryInsertPayload;
      const content = p.content ?? "";
      const metadata = (p.metadata ?? {}) as Record<string, unknown>;
      if (typeof content !== "string") {
        this.sendError(envelope, "INVALID_PAYLOAD", "memory.semantic.insert requires content (string)");
        return;
      }
      this.addDocument(content, metadata).then((id) => {
        this.sendResponse(envelope, { id });
      }).catch((err) => {
        this.sendError(envelope, "RAG_INSERT_ERROR", err instanceof Error ? err.message : String(err));
      });
      return;
    }

    if (type === "memory.semantic.search") {
      const p = payload as unknown as MemorySearchPayload;
      const query = p.query ?? "";
      const limit = typeof p.limit === "number" ? p.limit : 5;
      if (typeof query !== "string") {
        this.sendError(envelope, "INVALID_PAYLOAD", "memory.semantic.search requires query (string)");
        return;
      }
      this.search(query, limit).then((results) => {
        this.sendResponse(envelope, { results });
      }).catch((err) => {
        this.sendError(envelope, "RAG_SEARCH_ERROR", err instanceof Error ? err.message : String(err));
      });
      return;
    }
  }

  private sendResponse(request: Envelope, result: unknown): void {
    const payload = responsePayloadSchema.parse({ status: "success", result });
    this.send({
      id: randomUUID(),
      correlationId: request.id,
      from: this.processName,
      to: request.from,
      type: "response",
      version: PROTOCOL_VERSION,
      timestamp: Date.now(),
      payload,
    });
  }

  private sendError(request: Envelope, code: string, message: string): void {
    this.send({
      id: randomUUID(),
      correlationId: request.id,
      from: this.processName,
      to: request.from,
      type: "error",
      version: PROTOCOL_VERSION,
      timestamp: Date.now(),
      payload: { code, message, details: {} },
    });
  }
}

function dotProduct(a: number[], b: number[]): number {
  let sum = 0;
  const len = Math.min(a.length, b.length);
  for (let i = 0; i < len; i++) sum += a[i]! * b[i]!;
  return sum;
}

function main(): void {
  const service = new RAGService();
  service.start();
}

main();
