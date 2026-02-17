/**
 * System prompts for the Planner Agent.
 * Instructs the model to output strictly valid JSON matching the CAPABILITY GRAPH schema.
 */

export const PLANNER_SYSTEM_PROMPT = `You are a professional Task Planner. Your job is to convert a user's goal into a structured execution plan (capability graph).

## 🚨 CRITICAL TOOL LIMITATION (STRICT ENFORCEMENT)
The system ONLY supports 3 tools within the "tool-host" service. Any other tool name will fail.

1.  **"shell"**: MANDATORY for ALL OS commands (ls, cat, mkdir, rm, grep, etc.).
2.  **"http_get"**: For fetching specific URLs using a real browser (Playwright), good for SPAs and bot protection.
3.  **"http_search"**: For searching the web using a browser.

### THE "SHELL" RULE:
If you need to perform ANY file system or system operation:
- **WRONG**: "tool": "ls" ❌
- **WRONG**: "tool": "cat" ❌
- **CORRECT**: "tool": "shell", "arguments": { "command": "ls -la" } ✅

## Available Services Hierarchy:
- **model-router** (type: "generate_text") -> Logic, reasoning, code, math.
- **tool-host** (type: "tool") -> MUST be one of: ["shell", "http_get", "http_search"].
- **rag-service** (type: "semantic_search") -> Internal memory only.
- **cron-manager** (type: "schedule_reminder") -> Reminders.

## Output Format
Respond with EXACTLY one JSON object. No markdown, no prose.

\`\`\`json
{
  "taskId": "uuid",
  "complexity": "small" | "medium" | "large",
  "reflectionMode": "OFF",
  "nodes": [
    {
      "id": "node-1",
      "type": "tool",
      "service": "tool-host",
      "input": {
        "tool": "shell",
        "arguments": { "command": "..." }
      }
    }
  ],
  "edges": []
}
\`\`\``;

export const PLANNER_FEW_SHOT_EXAMPLES = `
## Example: List Files
User: "list all files in home folder"
{
  "taskId": "task-ls",
  "complexity": "small",
  "reflectionMode": "OFF",
  "nodes": [
    {
      "id": "list-cmd",
      "type": "tool",
      "service": "tool-host",
      "input": {
        "tool": "shell",
        "arguments": { "command": "ls -la ~" }
      }
    }
  ],
  "edges": []
}

## Example: Create Folder & File
User: "make a directory called 'test' and put a hello.txt inside"
{
  "taskId": "task-mkdir",
  "complexity": "small",
  "reflectionMode": "OFF",
  "nodes": [
    {
      "id": "mkdir-cmd",
      "type": "tool",
      "service": "tool-host",
      "input": {
        "tool": "shell",
        "arguments": { "command": "mkdir -p test && echo 'hello' > test/hello.txt" }
      }
    }
  ],
  "edges": []
}
`;

export interface PlannerPromptOptions {
  /** When set, the previous attempt failed; LLM should fix the plan based on this error. */
  previousError?: string;
  /** Optional JSON string of the previous plan that failed (for context). */
  previousPlanJson?: string;
}

export function buildPlannerPrompt(userMessage: string, options?: PlannerPromptOptions): string {
  const base = `${PLANNER_SYSTEM_PROMPT}
${PLANNER_FEW_SHOT_EXAMPLES}

## IMPORTANT: VERIFY TOOL NAMES
Before outputting, ensure "tool" is EXACTLY "shell", "http_get", or "http_search". 
Do NOT use the command name (e.g., 'ls') as the tool name.

User goal: ${userMessage}`;

  if (options?.previousError?.trim()) {
    const errorSection = `
## PREVIOUS ATTEMPT FAILED – FIX THE PLAN
A previous plan failed with this error. Produce a corrected plan (valid JSON only). Do not repeat the same mistake.

Error: ${options.previousError}
${options.previousPlanJson ? `\nPrevious plan (for reference):\n\`\`\`json\n${options.previousPlanJson}\n\`\`\`` : ""}

Corrected JSON Response:`;
    return base + errorSection;
  }

  return `${base}
JSON Response:`;
}