/**
 * Telegram Adapter: standalone service that interfaces the platform with Telegram.
 * Normalizes incoming messages to the Message Protocol and forwards to Core;
 * receives responses from Core and sends them back to the user.
 * See _board/TASKS/P4-01_TELEGRAM_ADAPTER.md
 */

import TelegramBot from "node-telegram-bot-api";
import { randomUUID } from "node:crypto";
import { PROTOCOL_VERSION } from "../shared/protocol.js";
import type { Envelope } from "../shared/protocol.js";
import { BaseProcess } from "../shared/base-process.js";

const PROCESS_NAME = "telegram-adapter";

/** Payload for incoming Telegram messages sent to Core */
export interface TelegramIncomingPayload {
  chatId: number;
  userId: number;
  username?: string;
  text: string;
  messageId: number;
}

/** Payload for messages from Core instructing the adapter to send to Telegram */
export interface TelegramSendPayload {
  chatId: number;
  text: string;
  parseMode?: "HTML" | "Markdown" | "MarkdownV2";
}

function createEnvelope<T>(type: string, to: string, payload: T): Envelope<T> {
  return {
    id: randomUUID(),
    timestamp: Date.now(),
    from: PROCESS_NAME,
    to,
    type,
    version: PROTOCOL_VERSION,
    payload,
  };
}

function main(): void {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    console.error("TELEGRAM_BOT_TOKEN environment variable is required");
    process.exit(1);
  }

  const bot = new TelegramBot(token, { polling: true });
  const base = new BaseProcess({ processName: PROCESS_NAME });

  // Incoming Telegram message → normalize to protocol and send to Core
  bot.on("message", (msg) => {
    const chatId = msg.chat?.id;
    const from = msg.from;
    const text = msg.text?.trim();
    if (chatId == null || from == null) return;
    if (!text) {
      void bot.sendMessage(chatId, "Please send a text message.");
      return;
    }

    const payload: TelegramIncomingPayload = {
      chatId,
      userId: from.id,
      text,
      messageId: msg.message_id ?? 0,
      ...(from.username !== undefined && from.username !== "" && { username: from.username }),
    };
    const envelope = createEnvelope<TelegramIncomingPayload>(
      "telegram.incoming",
      "core",
      payload
    );
    base.send(envelope);
  });

  // Messages from Core (stdin) → send to Telegram user
  base.onMessage((envelope: Envelope) => {
    if (envelope.to !== PROCESS_NAME) return;

    if (envelope.type === "telegram.send") {
      const pl = envelope.payload as TelegramSendPayload;
      if (typeof pl.chatId === "number" && typeof pl.text === "string") {
        bot
          .sendMessage(pl.chatId, pl.text, { parse_mode: pl.parseMode })
          .catch((err) => {
            console.error("Telegram send error:", err);
          });
      }
      return;
    }

    // Response envelope with result containing chatId + text (e.g. from Orchestrator)
    if (envelope.type === "response") {
      const pl = envelope.payload as { status: string; result?: unknown };
      if (pl.status === "success" && pl.result && typeof pl.result === "object") {
        const r = pl.result as { chatId?: number; text?: string };
        if (typeof r.chatId === "number" && typeof r.text === "string") {
          bot.sendMessage(r.chatId, r.text).catch((err) => {
            console.error("Telegram send error:", err);
          });
        }
      }
    }
  });

  base.start();
}

main();
