#!/usr/bin/env node
// iternal — command-line tool for the ITERNAL Agent Platform.
// Zero dependencies (native fetch, Node 18+).
//
// Auth (env):
//   ITERNAL_TOKEN     a personal access token (itl_pat_…) — Settings → Personal access tokens
//   ITERNAL_API_URL   platform URL (default: production)
import fs from "node:fs";

const BASE = (process.env.ITERNAL_API_URL || "https://agents-iternal.icmserver008.com").replace(/\/+$/, "");
const TOKEN = process.env.ITERNAL_TOKEN || "";

const KNOWLEDGE_TYPES = [".pdf", ".txt", ".md", ".csv", ".json"];
const INTERVALS = [
  "EVERY_5_MIN", "EVERY_15_MIN", "EVERY_30_MIN", "EVERY_HOUR",
  "EVERY_6_HOURS", "EVERY_12_HOURS", "DAILY", "WEEKLY",
];
const BASIC_TOOLS = ["Browse Web", "URL Retrieval", "Search Knowledge Base"];
const MODELS = [
  "gpt-5", "gpt-5.1", "gpt-4.1", "o3", "gpt-4o",
  "claude-opus-4-8", "claude-sonnet-4-6", "claude-opus-4-5", "gemini-2.5-pro",
  "deepseek-v4", "deepseek-r1", "qwen3-max", "glm-5.2", "kimi-k2", "minimax-m3",
];

const enc = encodeURIComponent;
const die = (msg, code = 1) => { console.error(`error: ${msg}`); process.exit(code); };
const out = (v) => console.log(typeof v === "string" ? v : JSON.stringify(v, null, 2));

// SSRF guard for --url (block loopback / private / link-local / metadata hosts).
function assertPublicUrl(u) {
  let p;
  try { p = new URL(u); } catch { die(`invalid url: ${u}`); }
  if (p.protocol !== "http:" && p.protocol !== "https:") die("only http(s) URLs are allowed");
  const h = p.hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (
    h === "localhost" || h.endsWith(".localhost") || h === "0.0.0.0" || h === "::1" ||
    /^127\./.test(h) || /^10\./.test(h) || /^192\.168\./.test(h) || /^169\.254\./.test(h) ||
    /^172\.(1[6-9]|2[0-9]|3[01])\./.test(h) ||
    h.startsWith("fc") || h.startsWith("fd") || h.startsWith("fe80")
  ) die(`refusing to fetch internal/private address: ${h}`);
}

async function api(method, path, body) {
  if (!TOKEN) die("ITERNAL_TOKEN is not set — generate one in Settings → Personal access tokens");
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { Authorization: `Bearer ${TOKEN}`, ...(body ? { "Content-Type": "application/json" } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json;
  try { json = text ? JSON.parse(text) : {}; } catch { json = text; }
  if (!res.ok) {
    const detail = typeof json === "string" ? json : JSON.stringify(json);
    die(`${method} ${path} → ${res.status}: ${String(detail).slice(0, 300)}`);
  }
  return json;
}

function parseArgs(argv) {
  const positional = [], flags = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith("--")) {
      const key = a.slice(2);
      const val = i + 1 < argv.length && !argv[i + 1].startsWith("--") ? argv[++i] : "true";
      flags[key] = flags[key] === undefined ? val : [].concat(flags[key], val);
    } else {
      positional.push(a);
    }
  }
  return { positional, flags };
}
const arr = (v) => (v === undefined ? [] : Array.isArray(v) ? v : [v]);
const allowedExt = (name) => KNOWLEDGE_TYPES.some((e) => name.toLowerCase().endsWith(e));

const HELP = `iternal — manage ITERNAL agents from the terminal

Auth (env):  ITERNAL_TOKEN=itl_pat_…   ITERNAL_API_URL=${BASE}

Agents
  iternal agents list
  iternal agents get <id>
  iternal agents create --name "Name" [--prompt "…"] [--model gpt-5] [--description "…"]
                        [--tool "Browse Web"]…  [--composio GOOGLEDRIVE_CREATE_FILE_FROM_TEXT]…
  iternal agents delete <id>

Scheduling
  iternal schedule <agentId> --name "Weekly brief" --instruction "…" --interval WEEKLY
  iternal tasks list <agentId>
  iternal tasks delete <agentId> <taskId>

Knowledge base (RAG)
  iternal knowledge upload <agentId> --name doc.md [--text "…" | --file ./doc.md | --url https://…]
  iternal knowledge list <agentId>
  iternal knowledge delete <agentId> <sourceId>

Composio (external SaaS tools)
  iternal composio connections
  iternal composio connect <toolkit>          # e.g. googledrive — returns an OAuth URL

Other
  iternal models
  iternal help

Intervals:       ${INTERVALS.join(", ")}
Built-in tools:  ${BASIC_TOOLS.join(", ")}`;

async function uploadKnowledge(agentId, flags) {
  const filename = flags.name || (typeof flags.file === "string" ? flags.file.split("/").pop() : undefined);
  if (!filename) die("--name is required (file name with extension)");
  if (!allowedExt(filename)) die(`filename must end with one of: ${KNOWLEDGE_TYPES.join(", ")}`);
  let data;
  if (flags.text !== undefined && flags.text !== "true") {
    data = flags.text;
  } else if (flags.file) {
    if (!allowedExt(flags.file)) die(`refusing to read a non-document file; must end with one of: ${KNOWLEDGE_TYPES.join(", ")}`);
    data = new Uint8Array(fs.readFileSync(flags.file));
  } else if (flags.url) {
    assertPublicUrl(flags.url);
    const r = await fetch(flags.url, { redirect: "error" });
    if (!r.ok) die(`fetch ${flags.url} → ${r.status}`);
    data = new Uint8Array(await r.arrayBuffer());
  } else {
    die("provide one of: --text, --file, --url");
  }
  const fd = new FormData();
  fd.append("file", new Blob([data]), filename);
  const res = await fetch(`${BASE}/api/apps/${enc(agentId)}/knowledge`, {
    method: "POST",
    headers: { Authorization: `Bearer ${TOKEN}` },
    body: fd,
  });
  if (!res.ok) die(`upload → ${res.status}: ${(await res.text()).slice(0, 200)}`);
  out(`Uploaded "${filename}" to agent ${agentId} (chunked + embedded for RAG)`);
}

async function main() {
  const { positional, flags } = parseArgs(process.argv.slice(2));
  const [resource, action, ...rest] = positional;

  if (!resource || resource === "help" || flags.help) return out(HELP);

  if (resource === "agents") {
    if (action === "list") {
      const r = await api("GET", "/api/apps");
      return out((r.apps || []).map((a) => ({ id: a.id, name: a.name, model: a.model })));
    }
    if (action === "get") {
      if (!rest[0]) die("usage: iternal agents get <id>");
      return out(await api("GET", `/api/apps/${enc(rest[0])}`));
    }
    if (action === "create") {
      if (!flags.name) die("--name is required");
      const created = await api("POST", "/api/apps", {
        name: flags.name, prompt: flags.prompt, model: flags.model || "gpt-5", description: flags.description,
      });
      const app = created.app || created;
      const enabled = [];
      for (const t of arr(flags.tool)) {
        try { await api("POST", `/api/apps/${enc(app.id)}/actions`, { name: t, type: "BASIC" }); enabled.push(t); } catch { /* skip */ }
      }
      for (const slug of arr(flags.composio)) {
        try {
          await api("POST", `/api/apps/${enc(app.id)}/actions`, { name: slug, type: "COMPOSIO", requestBody: slug, description: `Composio ${slug}` });
          enabled.push(slug);
        } catch { /* skip */ }
      }
      return out(`Created agent "${app.name}" (${app.id})${enabled.length ? ` — tools: ${enabled.join(", ")}` : ""}`);
    }
    if (action === "delete") {
      if (!rest[0]) die("usage: iternal agents delete <id>");
      await api("DELETE", `/api/apps/${enc(rest[0])}`);
      return out(`Deleted agent ${rest[0]}`);
    }
    die(`unknown: iternal agents ${action || ""}`);
  }

  if (resource === "schedule") {
    const agentId = action;
    if (!agentId) die("usage: iternal schedule <agentId> --name … --instruction … --interval WEEKLY");
    if (!flags.name || !flags.instruction || !flags.interval) die("--name, --instruction and --interval are required");
    if (!INTERVALS.includes(flags.interval)) die(`--interval must be one of: ${INTERVALS.join(", ")}`);
    const r = await api("POST", `/api/apps/${enc(agentId)}/scheduled-tasks`, {
      name: flags.name, instruction: flags.instruction, interval: flags.interval,
    });
    const t = r.task || r;
    return out(`Scheduled "${t.name}" (${t.interval}) — next run ${t.nextRunAt} — id ${t.id}`);
  }

  if (resource === "tasks") {
    if (action === "list") {
      if (!rest[0]) die("usage: iternal tasks list <agentId>");
      const r = await api("GET", `/api/apps/${enc(rest[0])}/scheduled-tasks`);
      return out((r.tasks || []).map((t) => ({ id: t.id, name: t.name, interval: t.interval, enabled: t.enabled, nextRunAt: t.nextRunAt })));
    }
    if (action === "delete") {
      const [agentId, taskId] = rest;
      if (!agentId || !taskId) die("usage: iternal tasks delete <agentId> <taskId>");
      await api("DELETE", `/api/apps/${enc(agentId)}/scheduled-tasks?taskId=${enc(taskId)}`);
      return out(`Deleted task ${taskId}`);
    }
    die(`unknown: iternal tasks ${action || ""}`);
  }

  if (resource === "knowledge") {
    if (action === "upload") {
      if (!rest[0]) die("usage: iternal knowledge upload <agentId> --name doc.md [--text|--file|--url]");
      return uploadKnowledge(rest[0], flags);
    }
    if (action === "list") {
      if (!rest[0]) die("usage: iternal knowledge list <agentId>");
      const r = await api("GET", `/api/apps/${enc(rest[0])}/knowledge`);
      return out((r.sources || []).map((s) => ({ id: s.id, fileName: s.fileName, status: s.status })));
    }
    if (action === "delete") {
      const [agentId, sourceId] = rest;
      if (!agentId || !sourceId) die("usage: iternal knowledge delete <agentId> <sourceId>");
      await api("DELETE", `/api/apps/${enc(agentId)}/knowledge?sourceId=${enc(sourceId)}`);
      return out(`Deleted knowledge source ${sourceId}`);
    }
    die(`unknown: iternal knowledge ${action || ""}`);
  }

  if (resource === "composio") {
    if (action === "connections") {
      const r = await api("GET", "/api/composio/connections");
      return out(r.connected || []);
    }
    if (action === "connect") {
      if (!rest[0]) die("usage: iternal composio connect <toolkit>");
      const r = await api("POST", "/api/composio/connect", { toolkit: rest[0] });
      return out(r.redirect_url ? `Open this URL to connect "${rest[0]}":\n${r.redirect_url}` : JSON.stringify(r));
    }
    die(`unknown: iternal composio ${action || ""}`);
  }

  if (resource === "models") return out(MODELS);

  die(`unknown command: ${resource} ${action || ""}\nRun "iternal help".`);
}

main().catch((e) => die(e?.message || String(e)));
