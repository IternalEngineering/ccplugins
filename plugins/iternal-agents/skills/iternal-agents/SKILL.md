---
name: iternal-agents
description: Create and manage AI agents (chatbots/assistants), multi-step schedules, knowledge bases (RAG), and external-tool connections on the ITERNAL Agent Platform. Use when the user wants to build, configure, schedule, or tear down an ITERNAL agent/app — e.g. "make an agent that …", "schedule it weekly", "add documents to its knowledge base", or "connect Google Drive". Wraps the bundled `iternal` CLI (PAT-authenticated REST calls).
---

# ITERNAL agents

Build and operate agents on the **ITERNAL Agent Platform**. An "agent" is an app with a prompt, a
model, optional tools (built-in + external SaaS via Composio), an optional knowledge base, and
optional schedules. This skill drives the `iternal` CLI bundled with the plugin.

## Setup (run once per shell)

The CLI ships with this plugin. Alias it, and export your credentials:

```bash
alias iternal='node "$CLAUDE_PLUGIN_ROOT/cli/iternal.mjs"'
export ITERNAL_TOKEN="itl_pat_…"     # platform → Settings → Personal access tokens
export ITERNAL_API_URL="https://agents-iternal.icmserver008.com"   # default; or http://localhost:3001
iternal help
```

If `ITERNAL_TOKEN` is missing, ask the user to generate one — never invent or hardcode a token.

## Commands

```
iternal agents list | get <id> | delete <id>
iternal agents create --name "Name" [--prompt "…"] [--model gpt-5] [--description "…"]
                      [--tool "Browse Web"]…  [--composio GOOGLEDRIVE_CREATE_FILE_FROM_TEXT]…
iternal schedule <agentId> --name "…" --instruction "…" --interval WEEKLY
iternal tasks list <agentId> | delete <agentId> <taskId>
iternal knowledge upload <agentId> --name doc.md [--text "…" | --file ./doc.md | --url https://…]
iternal knowledge list <agentId> | delete <agentId> <sourceId>
iternal composio connections | connect <toolkit>
iternal models
```

- Built-in `--tool`s: `Browse Web`, `URL Retrieval`, `Search Knowledge Base` (repeatable).
- `--composio` slugs (repeatable): e.g. `GOOGLEDRIVE_CREATE_FILE_FROM_TEXT`, `GMAIL_SEND_EMAIL`.
- Intervals: `EVERY_5_MIN`, `EVERY_15_MIN`, `EVERY_30_MIN`, `EVERY_HOUR`, `EVERY_6_HOURS`, `EVERY_12_HOURS`, `DAILY`, `WEEKLY`.

## Recipe: build → wire → schedule

```bash
iternal agents create --name "AR Finder" \
  --prompt "Search the web for recent AR articles and save a brief to Google Drive. Complete autonomously." \
  --tool "Browse Web" --composio GOOGLEDRIVE_CREATE_FILE_FROM_TEXT
#   → Created agent "AR Finder" (cmr0…)  — copy that id

iternal schedule cmr0… --name "Weekly AR brief" \
  --instruction "Find recent AR articles, write a brief, save to Drive." --interval WEEKLY
```

## Important — flag these to the user

- **Composio (Drive/Gmail/etc.) needs a one-time OAuth connection** you can't automate. Run
  `iternal composio connect googledrive`, give the user the returned URL to authorize, then the tool
  works. Until connected it returns `auth_required`. Check status with `iternal composio connections`.
- **Creating an agent doesn't run it.** It runs when chatted with or when a schedule fires.
- **`agents delete` and `knowledge delete` are permanent** — confirm with the user before deleting.
- **Knowledge files** must be `.pdf/.txt/.md/.csv/.json`. `--file`/`--url` are guarded (no reading
  arbitrary local files, no private/loopback URLs).

A PAT carries full account access — keep it secret; revoke it from Settings if leaked.
