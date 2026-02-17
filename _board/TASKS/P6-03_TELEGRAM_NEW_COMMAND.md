# Task: P6-03 Telegram /new Command and Session Tracking

## Description
Implement the `/new` command in Telegram Adapter to reset the current session and trigger archiving.

## Requirements
- Add `/new` to allowed commands in `TelegramBot.on("message")`.
- Maintain a state mapping `chatId -> currentConversationId`.
- When `/new` is received:
    - Generate a NEW UUID for the next conversation.
    - Send a `chat.new` event to Core with the OLD `conversationId` and `chatId`.
    - Notify user that a new session has started.

## Definition of Done
- `/new` command is recognized by the bot.
- Sending `/new` changes the conversation ID for subsequent tasks.
- `chat.new` event is sent to Orchestrator.
