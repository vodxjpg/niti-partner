// openapi.mjs
//
// An OpenAPI 3.1 document, generated FROM the reference pages.
//
// Not hand-written, and not a second source of truth. Every page already
// declares its operations in a fixed shape:
//
//   <span class="badge post">POST</span> `/api/v1/partner/customers/{id}/…`
//
// so the spec is derived from the same text a human reads. A hand-maintained
// spec drifts the moment someone edits a page and forgets it exists, and a
// drifted spec is worse than none — it is confidently wrong in a client
// generator.
//
// Deliberately partial. It carries paths, methods, summaries, security,
// path/query parameters and the request/response EXAMPLES that appear on the
// page. It does not invent JSON Schemas for bodies: the docs describe fields in
// prose tables, and machine-reading those would produce a schema that looks
// authoritative and is not. `GET /onboarding/schema` is the machine-readable
// field contract; this is the machine-readable surface map.

const BADGE_RE =
  /<span class="badge (get|post|patch|delete|put)">[A-Z]+<\/span>\s*`([^`]+)`/gi;

/** Scopes are written in a blockquote, e.g. "> Required scope: `payments:read`". */
const SCOPE_LINE_RE = /^>\s*(?:required\s+)?scopes?\s*:(.*)$/gim;

/** ```json fences, with the heading that introduced them. */
function jsonBlocks(body) {
  const out = [];
  let heading = "";
  const lines = body.split("\n");
  for (let i = 0; i < lines.length; i += 1) {
    const h = /^#{2,3}\s+(.*)$/.exec(lines[i]);
    if (h) heading = h[1].trim();
    if (!/^```json\s*$/.test(lines[i])) continue;
    const start = i + 1;
    let end = start;
    while (end < lines.length && !/^```\s*$/.test(lines[end])) end += 1;
    const raw = lines.slice(start, end).join("\n");
    try {
      out.push({ heading, value: JSON.parse(raw) });
    } catch {
      /* prose sample rather than a literal payload — skip it */
    }
    i = end;
  }
  return out;
}

/** The `-d '{…}'` payload from the page's curl example, when it is real JSON. */
function curlBody(body) {
  const m = /-d\s+'([\s\S]*?)'\s*$/m.exec(body);
  if (!m) return null;
  try {
    return JSON.parse(m[1]);
  } catch {
    return null;
  }
}

function scopesFor(body) {
  const scopes = new Set();
  for (const m of body.matchAll(SCOPE_LINE_RE)) {
    for (const s of m[1].matchAll(/`([a-z]+:[a-z_]+)`/g)) scopes.add(s[1]);
  }
  return [...scopes];
}

/**
 * The prose between the badge block and the next heading.
 *
 * That paragraph is what a human reads first, so it is the honest summary. HTML
 * and link syntax are stripped rather than rendered — this ends up in a client
 * generator's docstrings, not a browser.
 */
function leadParagraph(body) {
  const afterBadges = body.split(/<\/span>\s*`[^`]+`/).pop() ?? "";
  const untilHeading = afterBadges.split(/\n#{2,3}\s/)[0] ?? "";
  const text = untilHeading
    .split("\n")
    .filter((l) => !/^\s*>/.test(l) && l.trim() !== "")
    .join(" ")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/<[^>]+>/g, "")
    .replace(/[*`]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return text.slice(0, 400);
}

function parametersFor(path, body) {
  const params = [...path.matchAll(/\{([^}]+)\}/g)].map((m) => ({
    name: m[1],
    in: "path",
    required: true,
    schema: { type: "string" },
  }));

  // Query parameters are documented as `?name=` in prose; only pick up the ones
  // stated that way, rather than guessing from every backticked token.
  for (const m of body.matchAll(/`\?([a-z_]+)=/g)) {
    if (!params.some((p) => p.name === m[1])) {
      params.push({ name: m[1], in: "query", required: false, schema: { type: "string" } });
    }
  }
  return params;
}

function operationId(method, path) {
  const tail = path
    .replace(/^\/api\/v1\/partner\/?/, "")
    .replace(/\{[^}]+\}/g, "by")
    .split(/[^a-zA-Z0-9]+/)
    .filter(Boolean)
    .map((s, i) => (i === 0 ? s : s[0].toUpperCase() + s.slice(1)))
    .join("");
  return `${method.toLowerCase()}${tail ? tail[0].toUpperCase() + tail.slice(1) : "Root"}`;
}

/**
 * Build the document from every parsed page.
 *
 * `pages` is `{ rel, fm, body }` — the same objects the site build already has,
 * so this costs one extra pass and no extra parsing.
 */
export function buildOpenApi(pages, { version }) {
  const paths = {};
  let operations = 0;

  for (const { rel, fm, body } of pages) {
    const badges = [...body.matchAll(BADGE_RE)];
    if (badges.length === 0) continue;

    const scopes = scopesFor(body);
    const blocks = jsonBlocks(body);
    const requestExample = curlBody(body);
    const summary = fm.title || rel;
    const description = leadParagraph(body);
    const tag = (fm.section || "").split("/").pop()?.trim() || "Partner API";

    for (const [, methodRaw, rawPath] of badges) {
      const method = methodRaw.toLowerCase();
      // Docs write the full path; OpenAPI carries it under the server URL.
      const path = rawPath.trim();
      if (!path.startsWith("/")) continue;

      const responses = {};
      for (const b of blocks) {
        const m = /Response\s*`?(\d{3})`?/i.exec(b.heading);
        const status = m ? m[1] : method === "post" ? "201" : "200";
        responses[status] ??= {
          description: b.heading || "Success",
          content: { "application/json": { example: b.value } },
        };
      }
      if (Object.keys(responses).length === 0) {
        responses["200"] = { description: "Success" };
      }

      const op = {
        operationId: operationId(method, path),
        summary,
        description,
        tags: [tag],
        parameters: parametersFor(path, body),
        responses,
        // Documented once in `errors`, not repeated per operation — every
        // partner endpoint answers the same envelope.
        "x-error-envelope": "/getting-started/errors.html",
      };

      if (scopes.length) op["x-required-scopes"] = scopes;

      if ((method === "post" || method === "patch" || method === "put") && requestExample) {
        op.requestBody = {
          required: true,
          content: { "application/json": { example: requestExample } },
        };
      }

      paths[path] ??= {};
      // The same operation can be declared on more than one page — the schema
      // endpoint appears in its own reference and again in a guide. First one
      // wins, and the count follows what actually landed: a reported number
      // that disagrees with the artefact is the kind of small lie that makes
      // generated output untrustworthy.
      if (!paths[path][method]) {
        paths[path][method] = op;
        operations += 1;
      }
    }
  }

  return {
    doc: {
      openapi: "3.1.0",
      info: {
        title: "Niftipay Partner API",
        version,
        description:
          "Generated from the partner reference at https://partners.niftipay.com. " +
          "Carries the surface map — paths, methods, scopes and examples. Field-level " +
          "contracts for KYB live at GET /api/v1/partner/onboarding/schema.",
        contact: { url: "https://partners.niftipay.com" },
      },
      servers: [{ url: "https://www.niftipay.com" }],
      components: {
        securitySchemes: {
          partnerToken: {
            type: "http",
            scheme: "bearer",
            bearerFormat: "JWT",
            description:
              "Short-lived JWT from POST /api/oauth/token (client_credentials). " +
              "Scope requests are all-or-nothing.",
          },
        },
      },
      security: [{ partnerToken: [] }],
      paths,
    },
    operations,
  };
}
