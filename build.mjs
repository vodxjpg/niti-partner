import { readFileSync, writeFileSync, mkdirSync, readdirSync, copyFileSync, existsSync, rmSync } from "node:fs";
import { join, dirname, extname, relative } from "node:path";
import { fileURLToPath } from "node:url";
import markdownIt from "markdown-it";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = __dirname;
const CONTENT = join(ROOT, "content");
const STATIC = join(ROOT, "static");
const DIST = join(ROOT, "dist");
const nav = JSON.parse(readFileSync(join(ROOT, "nav.json"), "utf8"));

const md = markdownIt({ html: true, linkify: true, typographer: true });

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
        for (const sub of p.pages) html += li(sub, sub.split("/").pop(), sub === current);
      } else if (typeof p === "string") {
        html += li(p, p.split("/").pop(), p === current);
      }
    }
    html += `</ul></div>`;
  }
  return html;
}

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
  <div class="brand"><img src="/static/niftipay-dark.svg" alt="Niftipay" class="logo-dark"><img src="/static/niftipay-light.svg" alt="Niftipay" class="logo-light"><span>Partners</span></div>
  <input id="search" type="search" placeholder="Search docs…" autocomplete="off">
  <button id="theme-toggle" aria-label="Toggle theme">◐</button>
</header>
<div class="layout">
  <aside id="sidebar">${renderSidebar(nav.groups, current)}</aside>
  <main id="content"><article>${body}</article></main>
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
const searchIndex = [];
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
  const text = body.replace(/[#*`>/]/g, " ").replace(/\s+/g, " ").slice(0, 2000);
  searchIndex.push({ title: fm.title || rel, url: "/" + rel + ".html", section: fm.section || "", text });
}
writeFileSync(join(DIST, "search-index.json"), JSON.stringify(searchIndex));
mkdirSync(join(DIST, "static"), { recursive: true });
for (const f of readdirSync(STATIC)) copyFileSync(join(STATIC, f), join(DIST, "static", f));
console.log(`built ${pages.length} pages`);
