# Apple Notes CLI (Skill)

Mandatory tool: Use the `shell` tool to execute `memo` commands.

## View & Search Notes
- **List all notes**: `memo notes`
- **Search notes (Fuzzy)**: `memo notes -s` then provide the query as standard input. 
- **View specific note**: After listing notes, use `memo notes -v N` (where N is the index from the list) to see the content.

## Create Notes (Non-interactive)
- **Quick add with title**: `memo notes -a "Note Title"`
  - This is the preferred method for automation. It creates a note with the specified title.
- **Add to specific folder**: `memo notes -f "Folder Name" -a "Note Title"`

## Folders
- **List all folders**: `memo notes -fl`

## Critical Rules
1. **Prefer Quick Add**: Always use `memo notes -a "TITLE"` to avoid interactive editors.
2. **Sequential Operations**: To view a note's content, you first need its index from `memo notes`. 
3. **No Attachments**: This tool only supports plain text.
4. **macOS Only**: Ensure you are on a macOS environment (default).

## Example Commands
- `memo notes` (List everything)
- `memo notes -f "Inbox" -a "Buy milk"` (Create note)
- `memo notes -fl` (List folders)