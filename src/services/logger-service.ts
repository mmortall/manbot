/**
 * Logger service: subscribes to event.* messages on stdin and persists them to a log file.
 * Uses pino for structured JSON logging per _docs/TECH.md.
 */

import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import pino from "pino";
import { BaseProcess } from "../shared/base-process.js";
import type { Envelope } from "../shared/protocol.js";

const LOG_DIR = "logs";
const LOG_FILE = "events.log";

function createLogger(): pino.Logger {
  const logPath = join(process.cwd(), LOG_DIR, LOG_FILE);
  mkdirSync(dirname(logPath), { recursive: true });
  const destination = pino.destination(logPath);
  return pino(
    {
      level: "info",
      base: null,
    },
    destination,
  );
}

/**
 * Logger service process: listens on stdin for event.* messages and writes
 * structured log entries (metadata + payload) to logs/events.log.
 */
export class LoggerService extends BaseProcess {
  private readonly log: pino.Logger;

  constructor() {
    super({ processName: "logger" });
    this.log = createLogger();
  }

  protected override handleEnvelope(envelope: Envelope): void {
    if (!envelope.type.startsWith("event.")) {
      return;
    }
    this.log.info({
      from: envelope.from,
      to: envelope.to,
      type: envelope.type,
      timestamp: envelope.timestamp,
      id: envelope.id,
      correlationId: envelope.correlationId,
      payload: envelope.payload,
    });
  }
}

function main(): void {
  const service = new LoggerService();
  service.start();
}

main();
