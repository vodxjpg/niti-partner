# AGENTS.md — niti-partner

Static documentation site for the Niftipay partner API, deployed to
`partners.niftipay.com`. Markdown in `content/` is compiled to `dist/` by
`build.mjs`. There is no framework and no SSG, and `markdown-it` is the only
runtime dependency. Keep it that way: a docs site that needs a toolchain is a
docs site that stops building.

## Where the truth lives

This repository documents an API it does not implement. The implementation is
`coinx`, under `src/app/api/v1/partner/**`, with the shared helpers in
`src/lib/partners/**`.

**Every path, method, scope, field name, status code and error code must be
derived from that route code — never invented, never remembered, never carried
over from an older page.** A documented field that does not exist is worse than
an undocumented one: a partner branches on it, and the branch is dead code on
both sides forever. If the code and an existing page disagree, the code wins and
the page is wrong.

Two things that are easy to get wrong because the code is explicit about them:

- The envelope. Success is `{ data, request_id, api_version }`; failure is
  `{ error: { code, message, request_id, details } }` (`src/lib/api/partnerResponse.ts`).
  `api_version` is `2026-08-01`.
- Scopes and capabilities are different gates. The scope is on the token
  (`ALLOWED_SCOPES` in `src/lib/partners/partnerDb.ts`); the capability is on the
  partner/merchant relationship (`src/lib/partners/partnerCapabilityDb.ts`). A
  page that names one and omits the other is incomplete.

Document the behaviour that ships. If a limitation is real — a provider that
exposes no API for something, an ingestion path that covers only some
processors — say so on the page. A caveat a partner reads is cheaper than a
support thread.

## Page format is a build contract

`openapi.mjs` parses the Markdown to generate `dist/openapi.json`, so three
conventions are load-bearing rather than stylistic:

1. **Front matter** — `title:` and `section:` between `---` fences. The sidebar
   and the search index both read `title`.
2. **The endpoint badge**, exactly this shape, one per operation:

   ```
   <span class="badge get">GET</span> `/api/v1/partner/fiat-orders/{orderKey}`
   ```

   The generator's regex accepts `get|post|patch|delete|put`. No badge means no
   operation in the spec, and the build fails outright when the whole site
   produces zero operations.
3. **The scope line**, as a blockquote with the scope in backticks:
   `> Required scope: `payments:read``.

Response examples go in ```` ```json ```` fences under a heading; request
examples are read from the `curl` block. Keep the heading above each fence
meaningful — it becomes the example's label.

## Adding or changing a page

1. Read the route code in `coinx` first. Copy real field names out of the
   response mapper, not out of a sibling page.
2. Write or edit the file under `content/`.
3. **Add it to `nav.json`.** A page missing from the nav still builds and is
   still reachable, but it falls to the bottom of `llms-full.txt` and looks
   abandoned in the sidebar.
4. Run the build and read the counts it prints.

```bash
npm install
npm run build    # content/ -> dist/; prints pages, markdown, operations, paths
npm run dev      # serves dist/ on http://localhost:4173
```

A build that prints fewer operations than before means a badge stopped parsing.
Treat that as a failure even though the exit code is 0.

## Hard rules

- `dist/` is generated and git-ignored. Never commit it, never hand-edit it.
- No new dependency for something a few lines of Node can do, and no framework.
- No real tokens, client secrets, signing secrets, connection strings or
  customer data in an example. Use obvious placeholders.
- No reference to a hosted project's credentials, dashboard or environment.
- Deploying to `partners.niftipay.com` is a human gate. Vercel builds from
  `main` (`vercel.json`); a worker commits to its own branch and stops there.
