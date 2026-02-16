#!/usr/bin/env npx tsx
/**
 * Test script for BaseProcess: receives a JSONL message on stdin and responds on stdout.
 * Run: echo '{"id":"f47ac10b-58cc-4372-a567-0e02b2c3d479","from":"core","to":"test","type":"ping","version":"1.0","timestamp":1700000000000,"payload":{}}' | npx tsx scripts/test-base-process.ts
 */

import { BaseProcess } from "../src/shared/base-process.js";
import type { Envelope } from "../src/shared/protocol.js";

class EchoProcess extends BaseProcess {
  constructor() {
    super({ processName: "test" });
  }

  protected override handleEnvelope(envelope: Envelope): void {
    const response: Envelope = {
      ...envelope,
      id: crypto.randomUUID(),
      from: this.processName,
      to: envelope.from,
      type: "response",
      timestamp: Date.now(),
      payload: { status: "success", result: { echoed: envelope.payload } },
    };
    this.send(response);
  }
}

const proc = new EchoProcess();
proc.start();
