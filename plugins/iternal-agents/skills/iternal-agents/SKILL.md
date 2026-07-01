---
name: iternal-agents
description: Create and manage agents, schedules, knowledge bases (RAG), and external-tool connections on the hosted ITERNAL Agent Platform via a personal access token. Use when the user wants to build, configure, schedule, or tear down an ITERNAL agent/app as an end-user — e.g. "make an ITERNAL agent that …", "schedule my agent weekly", "add docs to my agent's knowledge base", "connect Google Drive to my agent". Wraps the bundled `iternal` CLI.
---

# ITERNAL agents

Build and operate agents on the **ITERNAL Agent Platform**. An "agent" is an app with a prompt, a
model, optional tools (built-in + external SaaS via Composio), an optional knowledge base, and
optional schedules. This skill drives the `iternal` CLI bundled with the plugin.

## Running the CLI — credentials on every call

Shell state does **not** persist between commands, so the token must be present on **each**
invocation. Either pass it inline:

```bash
ITERNAL_TOKEN="itl_pat_…" node "$CLAUDE_PLUGIN_ROOT/cli/iternal.mjs" agents list
```

…or write an env file once and `source` it **in the same command** as each call:

```bash
printf 'export ITERNAL_TOKEN=%q\nexport ITERNAL_API_URL=%q\n' "itl_pat_…" "https://agents-iternal.icmserver008.com" > .iternal.env
source .iternal.env && node "$CLAUDE_PLUGIN_ROOT/cli/iternal.mjs" agents list
```

- Token: platform → **Settings → Personal access tokens**. If it's missing, ask the user — never
  invent or hardcode a token.
- `ITERNAL_API_URL` defaults to production; use `http://localhost:3001` for local dev.

(Examples below write `iternal` for brevity — read it as `node "$CLAUDE_PLUGIN_ROOT/cli/iternal.mjs"`.)

## Commands

```
iternal agents list | get <id> | delete <id>
iternal agents create --name "Name" [--prompt "…"] [--model gpt-5] [--description "…"]
                      [--tool "Browse Web"]…  [--composio GOOGLEDRIVE_CREATE_FILE_FROM_TEXT]…
iternal agents update <id> [--name "…"] [--prompt "…"] [--model "…"] [--description "…"]
iternal schedule <agentId> --name "…" --instruction "…" --interval WEEKLY
iternal tasks list <agentId> | delete <agentId> <taskId>
iternal knowledge upload <agentId> --name doc.md [--text "…" | --file ./doc.md | --url https://…]
iternal knowledge list <agentId> | delete <agentId> <sourceId>
iternal composio tools | connections | connect <toolkit|slug>
iternal triggers create <agentId> --name "…" --type … --action … [--config '{…}'] | list <agentId> | delete <agentId> <triggerId>
iternal templates list | create <templateId> [--name "…"]
iternal embed <agentId> [--size small|medium|large] [--position bottom-right|bottom-left]
iternal models
```

## Triggers, templates & embed

- **Templates** — `iternal templates list` shows ~31 prebuilt agents; `iternal templates create <id>`
  spins one up (optionally `--name` to rename). Fastest way to stand up a working agent.
- **Triggers** (event automations) — `iternal triggers create <agentId> --name … --type T --action A --config '{…}'`.
  `--type`: `CONVERSATION_ENDED` | `DATA_CAPTURED` | `KEYWORD_DETECTED` | `TIME_DELAY`.
  `--action` + `--config`: `WEBHOOK` `{"url":"…","headers":{…}}` | `SLACK_WEBHOOK` `{"webhookUrl":"…"}` |
  `EMAIL` `{"to":"…","subject":"…"}` | `LOG_EVENT` `{}` | `START_AGENT` `{"targetAppId":"…"}`.
  `DATA_CAPTURED`/`KEYWORD_DETECTED` take `--conditions` (e.g. `'[{"keywords":["refund"]}]'`); `TIME_DELAY` takes `--delay <seconds>`.
- **Embed** — `iternal embed <agentId>` prints the website widget code (floating-bubble script + inline
  iframe) to paste into a site. `--size` and `--position` adjust it. (Multi-agent **workflows** are
  built by chaining agents with `START_AGENT` triggers.)

## Tools & Composio slugs

- **Built-in `--tool` names must be exact**: `Browse Web`, `URL Retrieval`, `Search Knowledge Base`, `Read Document`, `Image Recognition`, `Analyse Visual`, `Document OCR`, `Image Generation`, `Video`, `Scheduled Tasks`
  (repeatable). A wrong name is **rejected** — always read the `create` output: confirm each tool is
  in the `— tools:` line, and that there is no `WARNING: rejected …` line.
- **Composio `--composio` slugs**: discover valid ones with `iternal composio tools` (or the
  platform's Connect UI). Don't invent slugs — confirm an unfamiliar one with the user. Default model
  is `minimax-m3` when `--model` is omitted (`iternal models` lists them).

## Recipe: build → wire → connect → schedule

```bash
# 1) create + enable tools — CHECK the output for any "WARNING: rejected"
iternal agents create --name "AR Finder" \
  --prompt "Search the web for recent AR articles and save a brief to Google Drive. Complete autonomously." \
  --tool "Browse Web" --composio GOOGLEDRIVE_CREATE_FILE_FROM_TEXT
#   → Created agent "AR Finder" (cmr0…)

# 2) connect the Composio toolkit (one-time OAuth) — give the user the URL to authorize
iternal composio connect googledrive

# 3) schedule it
iternal schedule cmr0… --name "Weekly AR brief" \
  --instruction "Find recent AR articles, write a brief, save to Drive." --interval WEEKLY
```

## Important — flag these to the user

- **Composio toolkit = the lowercase prefix of the slug** (`GOOGLEDRIVE_…` → `googledrive`,
  `GMAIL_…` → `gmail`); `composio connect` accepts either form. The OAuth authorize step **can't be
  automated** — the user opens the returned URL. A scheduled agent using an **unconnected** Composio
  tool **silently returns `auth_required`** and nothing visibly fails, so **connect before scheduling**
  and verify with `iternal composio connections`.
- **Creating an agent doesn't run it** — it runs when chatted with or when a schedule fires. Tools can
  only be **added at create time**; `agents update` changes name/prompt/model/description but can't
  remove tools.
- **Knowledge indexing is async** — `upload` returns immediately; check `iternal knowledge list` for
  `status: COMPLETED` before relying on retrieval.
- **`agents delete` and `knowledge delete` are permanent** — confirm with the user first.
- **Knowledge files** must be `.pdf/.txt/.md/.csv/.json`; `--file`/`--url` are guarded (no reading
  arbitrary local files, no private/loopback URLs).

A PAT carries full account access — keep it secret; revoke it from Settings if leaked.
