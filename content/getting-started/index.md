---
title: Introduction
section: Getting Started
---
# Introduction

The Niftipay Partner API lets a partner accept card and crypto payments on
behalf of its own customers, through a merchant's payment rails. This site
documents every partner endpoint.

## Base URL

```
https://www.niftipay.com/api/v1/partner
```

All paths below are relative to that base. The current API version is
`2026-08-01` and is returned on every response as `api_version`.

## Before you start

**Start here if you are integrating:** the two end-to-end walkthroughs cover
every call in order — [Card payments](/guides/fiat-lifecycle.html) and
[Crypto payments](/guides/crypto-lifecycle.html). The reference pages below
document each endpoint on its own; the guides put them in sequence.

1. Obtain a partner API key (see [Authentication](/getting-started/authentication.html)).
2. Understand [idempotency](/getting-started/idempotency.html) — every write
   requires an `Idempotency-Key`.
3. Read the [error model](/getting-started/errors.html).
