import { readFileSync, writeFileSync, mkdirSync, readdirSync, copyFileSync, existsSync, rmSync } from "node:fs";
import { join, dirname, extname, relative } from "node:path";
import { fileURLToPath } from "node:url";
import markdownIt from "markdown-it";
import { buildOpenApi } from "./openapi.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = __dirname;
const CONTENT = join(ROOT, "content");
const STATIC = join(ROOT, "static");
const DIST = join(ROOT, "dist");
const nav = JSON.parse(readFileSync(join(ROOT, "nav.json"), "utf8"));

const md = markdownIt({ html: true, linkify: true, typographer: true });

// Pretty-print ```json fenced blocks so response examples are multi-line and
// readable instead of one long line.
const defaultFence = md.renderer.rules.fence;
md.renderer.rules.fence = (tokens, idx, options, env, self) => {
  const token = tokens[idx];
  const info = token.info.trim();
  if (info === "json") {
    try {
      const pretty = JSON.stringify(JSON.parse(token.content), null, 2);
      return `<pre><code class="language-json">${md.utils.escapeHtml(pretty)}</code></pre>`;
    } catch {
      /* fall through to default renderer if not valid JSON */
    }
  }
  return defaultFence(tokens, idx, options, env, self);
};

// Slug -> human title, populated before the render loop so the sidebar can show
// real names ("Create a customer") instead of the URL slug ("create").
const pageTitles = new Map();

function walk(dir, acc = []) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) walk(p, acc);
    else if (extname(e.name) === ".md") acc.push(p);
  }
  return acc;
}

function parseFrontMatter(src) {
  const m = src.match(/^---\n([\s\S]*?)\n---\n?/);
  if (!m) return { fm: {}, body: src };
  const fm = {};
  for (const line of m[1].split("\n")) {
    const i = line.indexOf(":");
    if (i > -1) fm[line.slice(0, i).trim()] = line.slice(i + 1).trim();
  }
  return { fm, body: src.slice(m[0].length) };
}

function flattenNav(groups, out = []) {
  for (const g of groups) {
    if (g.pages) for (const p of g.pages) Array.isArray(p) ? out.push(...p) : (p.pages ? flattenNav([p], out) : out.push(p));
  }
  return out;
}

function renderSidebar(groups, current) {
  const li = (href, label, active) =>
    `<li><a href="/${href}.html" class="${active ? "active" : ""}">${label}</a></li>`;
  let html = "";
  for (const g of groups) {
    html += `<div class="nav-group"><div class="nav-group-title">${g.group}</div><ul>`;
    const items = g.pages || [];
    for (const p of items) {
      if (p.pages) {
        for (const sub of p.pages) html += li(sub, pageTitles.get(sub) || sub.split("/").pop(), sub === current);
      } else if (typeof p === "string") {
        html += li(p, pageTitles.get(p) || p.split("/").pop(), p === current);
      }
    }
    html += `</ul></div>`;
  }
  return html;
}

/**
 * The version stamped on the generated spec and on llms.txt.
 *
 * A date, like the API's own `api_version`: a partner pins to a day and asks
 * what changed since, which a semver on a docs site cannot answer.
 */
const DOCS_VERSION = new Date().toISOString().slice(0, 10);

function layout({ title, section, body, current, toc }) {
  return `<!doctype html>
<html lang="en" data-theme="light">
<head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title} — Niftipay Partners</title>
<link rel="icon" href="/static/favicon.svg">
<link rel="stylesheet" href="/static/style.css">
</head>
<body>
<header class="topbar">
  <div class="brand"><img src="/static/niftipay-logo.svg" alt="Niftipay" class="logo"><span>Partners</span></div>
  <input id="search" type="search" placeholder="Search docs…" autocomplete="off">
  <button id="theme-toggle" aria-label="Toggle theme">◐</button>
</header>
<div class="layout">
  <aside id="sidebar">${renderSidebar(nav.groups, current)}</aside>
  <main id="content">
    <div class="page-actions">
      <a class="md-link" href="/${current}.md" title="Raw Markdown for this page">Markdown</a>
      <button class="md-copy" data-md="/${current}.md" title="Copy this page as Markdown">Copy</button>
    </div>
    <article>${body}</article>
  </main>
  <aside id="toc">${toc}</aside>
</div>
<script src="/static/app.js"></script>
<script src="/static/search.js"></script>
</body></html>`;
}

function buildToc(html) {
  const hs = [...html.matchAll(/<h([23]) id="([^"]+)">([^<]+)</g)];
  if (!hs.length) return "";
  const items = hs.map((h) => `<li class="toc-h${h[1]}"><a href="#${h[2]}">${h[3]}</a></li>`).join("");
  return `<div class="toc-title">On this page</div><ul>${items}</ul>`;
}

rmSync(DIST, { recursive: true, force: true });
mkdirSync(DIST, { recursive: true });
const pages = walk(CONTENT);
for (const file of pages) {
  const { fm } = parseFrontMatter(readFileSync(file, "utf8"));
  const rel = relative(CONTENT, file).replace(/\.md$/, "");
  pageTitles.set(rel, fm.title || rel);
}
const searchIndex = [];
const parsedPages = [];
for (const file of pages) {
  const src = readFileSync(file, "utf8");
  const { fm, body } = parseFrontMatter(src);
  const rel = relative(CONTENT, file).replace(/\.md$/, "");
  const htmlBody = md.render(body);
  const toc = buildToc(htmlBody);
  const pageHtml = layout({
    title: fm.title || rel,
    section: fm.section || "",
    body: htmlBody,
    current: rel,
    toc,
  });
  const out = join(DIST, rel + ".html");
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, pageHtml);

  // The same page as raw Markdown, at the same path with a .md extension.
  // Partners paste these into an LLM, and Markdown survives that intact where
  // scraped HTML arrives full of nav chrome and lost code fences.
  writeFileSync(join(DIST, rel + ".md"), src);
  parsedPages.push({ rel, fm, body });
  const text = body.replace(/[#*`>/]/g, " ").replace(/\s+/g, " ").slice(0, 2000);
  searchIndex.push({ title: fm.title || rel, url: "/" + rel + ".html", section: fm.section || "", text });
}
writeFileSync(join(DIST, "search-index.json"), JSON.stringify(searchIndex));
mkdirSync(join(DIST, "static"), { recursive: true });
for (const f of readdirSync(STATIC)) copyFileSync(join(STATIC, f), join(DIST, "static", f));
// Root redirect: the intro page is getting-started/index; serve it at "/".
writeFileSync(
  join(DIST, "index.html"),
  `<!doctype html><html lang="en"><head><meta charset="utf-8">` +
    `<meta http-equiv="refresh" content="0;url=/getting-started/index.html">` +
    `<title>Niftipay Partners</title></head><body>Redirecting to <a href="/getting-started/index.html">getting started</a>…</body></html>`,
);

// ── Machine-readable exports ────────────────────────────────────────────────
//
// Three of them, because they answer three different questions:
//   llms.txt       what pages exist          (an index, cheap to fetch)
//   llms-full.txt  the whole corpus          (one paste into a model)
//   openapi.json   the surface, as a spec    (client generators, Postman)
//
// llms.txt follows the llmstxt.org convention: an H1, a blockquote summary, and
// linked sections. A model handed the index can fetch only the page it needs
// instead of the entire site.
const byGroup = new Map();
for (const { rel, fm } of parsedPages) {
  const group = (fm.section || "Reference").split("/")[0].trim();
  if (!byGroup.has(group)) byGroup.set(group, []);
  byGroup.get(group).push({ rel, title: fm.title || rel });
}

let llms = `# Niftipay Partner API\n\n`;
llms += `> Accept card and crypto payments on behalf of your own customers, through a merchant's payment rails. `;
llms += `Every page below is available as Markdown at the same path with a .md extension. `;
llms += `Docs version ${DOCS_VERSION}.\n\n`;
llms += `The full corpus in one file: https://partners.niftipay.com/llms-full.txt\n`;
llms += `Machine-readable surface: https://partners.niftipay.com/openapi.json\n`;
llms += `Machine-readable KYB fields: GET /api/v1/partner/onboarding/schema\n\n`;
for (const [group, items] of byGroup) {
  llms += `## ${group}\n\n`;
  for (const { rel, title } of items) {
    llms += `- [${title}](https://partners.niftipay.com/${rel}.md)\n`;
  }
  llms += `\n`;
}
writeFileSync(join(DIST, "llms.txt"), llms);

// Ordered by the sidebar rather than by filesystem walk: a model reading top to
// bottom should meet authentication before it meets withdrawals.
const navOrder = flattenNav(nav.groups);
const ordered = [
  ...navOrder.map((rel) => parsedPages.find((p) => p.rel === rel)).filter(Boolean),
  ...parsedPages.filter((p) => !navOrder.includes(p.rel)),
];
let full = `# Niftipay Partner API — complete documentation\n\n`;
full += `Docs version ${DOCS_VERSION}. Generated from https://partners.niftipay.com\n\n`;
for (const { rel, fm, body } of ordered) {
  full += `\n\n---\n\n# ${fm.title || rel}\n\n`;
  full += `Source: https://partners.niftipay.com/${rel}.html\n\n`;
  full += body.trim() + "\n";
}
writeFileSync(join(DIST, "llms-full.txt"), full);

const { doc, operations } = buildOpenApi(parsedPages, { version: DOCS_VERSION });
writeFileSync(join(DIST, "openapi.json"), JSON.stringify(doc, null, 2));

// A spec with no operations would still be valid JSON and completely useless —
// exactly the failure a generated artefact hides. Fail the build instead.
if (operations === 0) {
  throw new Error("openapi.json has no operations — the badge format the generator parses has changed");
}

console.log(
  `built ${pages.length} pages, ${parsedPages.length} markdown, ${operations} operations, ${Object.keys(doc.paths).length} paths`,
);
