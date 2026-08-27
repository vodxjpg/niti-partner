---
title: Machine-readable docs
section: Getting Started
---
# Machine-readable docs

Four artefacts, rebuilt on every deploy from the same pages you are reading. Use
them instead of scraping the HTML — scraped pages arrive with nav chrome, and
code fences do not survive the trip.

| What | Where | For |
|---|---|---|
| One page as Markdown | any page + `.md` | Pasting one endpoint into a model |
| Index of every page | [`/llms.txt`](/llms.txt) | Letting an agent fetch only what it needs |
| The whole corpus | [`/llms-full.txt`](/llms-full.txt) | One paste, whole API in context |
| OpenAPI 3.1 | [`/openapi.json`](/openapi.json) | Client generators, Postman, Insomnia |

## Any page, as Markdown

Swap `.html` for `.md`:

```
https://partners.niftipay.com/api/withdrawals/create.html   ← what you read
https://partners.niftipay.com/api/withdrawals/create.md     ← what you paste
```

Every page also carries **Markdown** and **Copy** buttons in the top right. Copy
puts the raw Markdown on your clipboard.

## `/llms.txt` and `/llms-full.txt`

[`/llms.txt`](/llms.txt) follows the [llmstxt.org](https://llmstxt.org)
convention: a short summary and every page as a link, grouped. Hand it to an
agent that can fetch, and it pulls the one page it needs rather than the whole
site.

[`/llms-full.txt`](/llms-full.txt) is everything concatenated, ordered the way
the sidebar is — so a model reading top to bottom meets authentication before it
meets withdrawals. Around 125 KB, which fits comfortably in a modern context
window.

```bash
curl -s https://partners.niftipay.com/llms-full.txt > niftipay-partner-api.md
```

## `/openapi.json`

OpenAPI 3.1, generated from these pages. Carries paths, methods, summaries,
path and query parameters, bearer security, the request and response examples
printed on each page, and `x-required-scopes` per operation.

```bash
npx @openapitools/openapi-generator-cli generate \
  -i https://partners.niftipay.com/openapi.json -g typescript-fetch -o ./niftipay
```

### What it deliberately does not contain

**Field-level JSON Schemas for request bodies.** The reference describes fields
in prose tables, and machine-reading those would produce a schema that looks
authoritative and is not — which is worse than none, because a client generator
would emit types from it without hesitating.

For the one place a field-level contract genuinely exists, use the API itself:

```
GET /api/v1/partner/onboarding/schema
```

That returns the KYB field set as data — every enum inline, `required_at_submit`
per field, repeating groups with their shapes. See
[Onboarding schema](/api/onboarding-schema.html).

So: **`openapi.json` is the surface map, `/onboarding/schema` is the field
contract.** Neither is a substitute for the other.

## Versioning

`openapi.json` carries `info.version`, and `llms.txt` states a docs version.
Both are dates. They move when the docs are rebuilt, which is not the same as
the API changing — the API's own contract version is `api_version`, returned on
every response, and that is the one to pin behaviour to.
