# Iternal Code Plugin Marketplace

A collection of custom plugins for [Claude Code](https://claude.ai/code) to enhance your development workflow.

## Overview

This repository serves as a plugin marketplace for Iternal workflow tools. Plugins extend Claude Code's functionality through hooks that execute at various points in the tool execution lifecycle.

## Available Plugins

### Bell Notifications (`bell-normal`)

A simple notification plugin that plays a bell sound when tasks are completed.

**Features:**
- Plays system sound (Glass.aiff on macOS) when todos are marked as completed
- Falls back to terminal bell on other platforms
- Non-intrusive - only triggers on actual task completion
- Can be disabled via environment variable

**Hook Type:** PostToolUse
**Triggers On:** TodoWrite tool when status changes to "completed"

**Installation:**
```bash
# Install from marketplace
/plugin marketplace add IternalEngineering/ccplugins
```

**Configuration:**
```bash
# Disable bell notifications
export ENABLE_BELL_NOTIFICATION=0
```

## Plugin Structure

Each plugin follows this structure:

```
plugins/
└── {plugin-name}/
    ├── .claude-plugin/
    │   └── plugin.json          # Plugin metadata
    └── hooks/
        ├── hooks.json            # Hook configuration
        └── {hook-script}.py      # Hook implementation
```

## Creating Your Own Plugin

1. **Create plugin directory:**
   ```bash
   mkdir -p plugins/my-plugin/.claude-plugin
   mkdir -p plugins/my-plugin/hooks
   ```

2. **Add plugin metadata** (`plugins/my-plugin/.claude-plugin/plugin.json`):
   ```json
   {
     "name": "my-plugin",
     "version": "1.0.0",
     "description": "Description of your plugin",
     "author": {
       "name": "Your Name",
       "email": "your.email@example.com"
     }
   }
   ```

3. **Configure hooks** (`plugins/my-plugin/hooks/hooks.json`):
   ```json
   {
     "description": "Hook description",
     "hooks": {
       "PostToolUse": [
         {
           "hooks": [
             {
               "type": "command",
               "command": "python3 ${CLAUDE_PLUGIN_ROOT}/hooks/my_hook.py"
             }
           ],
           "matcher": "ToolName"
         }
       ]
     }
   }
   ```

4. **Implement hook logic** (`plugins/my-plugin/hooks/my_hook.py`):
   ```python
   #!/usr/bin/env python3
   import json
   import sys

   # Read hook input
   input_data = json.loads(sys.stdin.read())

   # Your hook logic here

   # Exit codes:
   # 0 = allow tool to proceed
   # 2 = block tool (PreToolUse only)
   sys.exit(0)
   ```

5. **Register in marketplace** (`.claude-plugin/marketplace.json`):
   ```json
   {
     "plugins": [
       {
         "name": "my-plugin",
         "description": "Plugin description",
         "version": "1.0.0",
         "author": {
           "name": "Your Name",
           "email": "your.email@example.com"
         },
         "source": "./plugins/my-plugin",
         "category": "productivity"
       }
     ]
   }
   ```

## Hook Types

- **PreToolUse**: Executes before a tool runs (can block execution with exit code 2)
- **PostToolUse**: Executes after a tool completes (informational only)

## Available Tools to Hook

Common tools you can hook into:
- `Edit` - File editing operations
- `Write` - File creation operations
- `MultiEdit` - Multiple file edits
- `TodoWrite` - Todo list updates
- `Bash` - Shell command execution
- `Read` - File reading operations

## Environment Variables

- `ENABLE_BELL_NOTIFICATION` - Enable/disable bell notifications (default: 1)
- `CLAUDE_PLUGIN_ROOT` - Automatically set to plugin directory path

## Development

### Testing Plugins Locally

1. Clone this repository
2. Install plugins:
   ```bash
   /plugin marketplace add /path/to/proj_ccplugins_dev_marketplace
   ```

### Hook Input Format

Hooks receive JSON via stdin:
```json
{
  "session_id": "unique-session-id",
  "tool_name": "ToolName",
  "tool_input": {
    "parameter1": "value1",
    "parameter2": "value2"
  }
}
```

### Hook Exit Codes

- `0`: Allow tool to proceed (or no action for PostToolUse)
- `2`: Block tool execution (PreToolUse hooks only)

## License

MIT License - See individual plugin directories for specific license information.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-plugin`)
3. Commit your changes (`git commit -m 'Add amazing plugin'`)
4. Push to the branch (`git push origin feature/amazing-plugin`)
5. Open a Pull Request

## Support

For issues, questions, or feature requests, please open an issue on GitHub.

## Maintainers

- **Iternal Engineering**
- Contact: barnaby@iternal.life
