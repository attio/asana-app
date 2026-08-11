# AGENTS.md

This file provides guidance to AI agents who are working on the code in this repository.

## Context

This repository contains an app built with the Attio App SDK.

### What is the App SDK?

The App SDK is a set of components and functionality to build apps that are embedded directly in the Attio CRM platform.

#### App SDK capabilities

- Use React to render components provided by the `attio/client` package.
- Run server-side code and make API calls to external services using `.server.ts` files.
- Store API tokens using the connections system.
- Receive incoming requests from third-party services via webhooks.
- Subscribe to events e.g. connection.added
- Manage form rendering, validation and submission with `useForm()`.
- Manage data fetching and async caching with `useAsyncCache()` and `useQuery()`.

## Architecture

### File and folder structure

| Path                      | Description                                                                                                                                                                                                                                                                                                                                         |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/app.ts`              | The main entrypoint to the app                                                                                                                                                                                                                                                                                                                      |
| `src/app.settings.ts`     | The app's [settings schema](https://docs.attio.com/sdk/settings/overview)                                                                                                                                                                                                                                                                       |
| `src/attio`               | Code interacting with the [Attio API](https://docs.attio.com/rest-api/overview)                                                                                                                                                                                                                                                                     |
| `src/<service>`           | Code interacting with the third-party service (e.g. `src/notion`). Holds the API client wrapper, error types and helpers.                                                                                                                                                                                                                            |
| `src/call-recording`      | Call recording text actions for [transcripts](https://docs.attio.com/sdk/entry-points/call-recording-transcript-text-selection-action), [call insights](https://docs.attio.com/sdk/entry-points/call-recording-insight-text-selection-action) and [summaries](https://docs.attio.com/sdk/entry-points/call-recording-summary-text-selection-action) |
| `src/components`          | React components                                                                                                                                                                                                                                                                                                                                    |
| `src/events`              | .event.ts files used to implement event handlers e.g. connection.added.event.ts                                                                                                                                                                                                                                                                     |
| `src/graphql`             | GraphQL queries for the [Attio GraphQL schema](https://docs.attio.com/sdk/graphql/graphql)                                                                                                                                                                                                                                                          |
| `src/record/actions`      | [Record actions](https://docs.attio.com/sdk/extensions/record-action)                                                                                                                                                                                                                                                                                  |
| `src/record/bulk-actions` | [Bulk record actions](https://docs.attio.com/sdk/entry-points/bulk-record-action)                                                                                                                                                                                                                                                                   |
| `src/record/widgets`      | [Record widgets](https://docs.attio.com/sdk/entry-points/record-widget)                                                                                                                                                                                                                                                                             |
| `src/server-functions`    | `.server.ts` files exposing server-side functions to the client. Treat these like controllers — thin pass-throughs to the API client.                                                                                                                                                                                                               |
| `src/webhooks`            | .webhook.ts files used to implement webhook handlers                                                                                                                                                                                                                                                                                                |
| `src/utils`               | Shared utility functions                                                                                                                                                                                                                                                                                                                            |

This is a fresh app generated from the template. `src/app.ts` and `src/app.settings.ts` are intentionally minimal — add entry points and a `src/<service>` folder as you build.

## Environment

Code for the app may run either in a client-side or server-side context.

### Client-side code

Client-side code runs in the browser. However, it runs inside a safe sandbox, using a custom JS runtime. This means that:

- You MUST NOT render HTML tags directly e.g. `<div>Hello</div>`. Instead, you MUST only use components provided by the App SDK.
- You MUST NOT use custom styles or CSS. Only use the pre-styled components provided by the App SDK.
- You MUST NOT try to read the DOM directly.
- Some browser APIs may not be available.
- `fetch` calls are not allowed. You MUST NOT call `fetch` directly and should instead use `fetch` via server-side functions.

Files which render React components MUST use the `.tsx` extension.

### Server-side code

Server-side code runs in files ending in:

- `.server.ts`
- `.webhook.ts`
- `.event.ts`

Code that any of the above files import will also run in a server-side environment.

Server-side code DOES NOT run in Node.js but instead in a custom JS runtime. While many Node.js APIs are supported, some are not and you may need to factor this into your decision to use certain packages.

## Using the Attio App SDK

Attio provides three packages to help you build apps:

1. `attio/client` - for client-side imports
2. `attio/server` - for server-side imports
3. `attio` - for shared/environment-agnostic imports

IMPORTANT: Before importing from these packages, you MUST always check one of the following to confirm that your import is correct:

1. Existing examples in the codebase
2. TypeScript type definitions and JSDoc strings for the package
3. The Attio SDK documentation (the `attio-docs` MCP server is configured in `.mcp.json`)

If you are unsure about an import, always check explicitly and do not guess.

## Coding guidelines

- You SHOULD use Zod to validate data from public APIs.
- You SHOULD only include properties in Zod schemas that we explicitly need.
- You SHOULD use try/catch around calls to `.json()`.
- You SHOULD use console.error to capture information about unexpected errors.
- You MUST NOT log sensitive information such as email addresses or passwords.
- You MUST handle API errors gracefully. Do not throw an error within a React component, but instead return a clear fallback UI.
- You SHOULD prefer named arguments over positional arguments when using 3 or more arguments.
- You MUST NOT use `any` when typing your code. Type errors MUST be fixed properly as usage of `any` is a likely source of bugs.
- You SHOULD order functions/values within code so that all values are defined before being used. Default export should go at the bottom of a file.

### API clients

- If there is an official API client for the service, use it (e.g. `@notionhq/client`) unless there is a strong reason not to. Any errors you hit using such a client should be reported as a bug/feature request for AttioJS.
- All API clients MUST be wrapped in a [`@attio/fetchable`](https://www.npmjs.com/package/@attio/fetchable) layer so we get standardized, explicit error handling via `AsyncResult`.
- The wrapper MUST NOT leak transport-layer details. Don't return HTTP status codes on errors — return a semantic error (e.g. `NOT_FOUND`) instead. Test: if you switched from HTTP to GraphQL (or vice versa), would the errors need to change? If yes, they leak.
- Errors SHOULD include extra data useful for logging and for clear messages (e.g. which scopes are missing on an auth error).
- Error message _formatting_ is the responsibility of the caller, not the API client — final messages depend on the context they're rendered in.
- You MUST return data fast enough to avoid the 30s server execution timeout and keep the UI responsive. The usual culprit is pagination — bound paginated calls with a time budget so you stay well under the limit.
- Rate-limit errors SHOULD be retried with appropriate backoff. Retries MUST NOT exceed the 30s timeout.

### Getting connections

When `getUserConnection()` / `getWorkspaceConnection()` is called, you MUST NOT wrap it in a try/catch. These functions throw special `AttioError`s that power the connection dialogs in the UI. Call them OUTSIDE the try/catch, then proceed with the rest of your API code handling errors as normal.

### `.server.ts` files

Treat server functions like controllers — thin pass-throughs that call into the API client and return its `AsyncResult`. Keep business logic in the client/service layer.

### Workflow block configurators

- A configurator that loads data MUST keep loading until it is fully ready, **including all `Outcome`s**. Declare outcomes up front — the editor does NOT treat a block as loading just because it has no outcomes yet, so leaving them undeclared while data loads causes `Invalid path` errors in downstream blocks.
- You SHOULD load `ComboboxInput` options via an options provider (the `options` prop) rather than fetching the list yourself — outcomes stay stable and there is no loading state to manage.
- For other data, use `useAsyncCache` as a one-time, stable load with a fixed cache key. Do NOT re-key it off a value the member is still editing, or the block re-loads on every change.
- See https://docs.attio.com/sdk/workflows/configurator for details.

### Logging

- You MUST NOT log PII e.g. email addresses, physical addresses.
- Apps MUST NOT be submitted with temporary debug logging in place.

### User-facing error messages

- All error messages must be clean — don't dump raw JSON, square brackets etc into the UI.
- Don't leak technical detail the user doesn't care about (say "An unexpected error occurred when calling Notion's API", not "503 error from Notion").
- Strive to be actionable. If the user hits an auth error because a scope is missing, tell them which scope and, ideally, where to configure it.

### Testing

- Where appropriate, use Vitest to add unit tests. Aim for tests that increase confidence in the correctness of non-trivial logic (parsing, error mapping, helpers).
- Do NOT test React components with React Testing Library or similar.
- When passing functions/classes to `describe`, pass the value directly — `describe(myFn, () => {})`, not `describe("myFn", () => {})`.

## Reference: wrapping a service in `@attio/fetchable`

When you add a third-party service, follow this shape. Put it under `src/<service>/`.
This is the canonical pattern — copy and adapt it; don't invent a different one.

**1. Transport-agnostic error type** (`src/<service>/error.ts`):

```ts
// No HTTP status codes leak out — just semantic codes the caller can switch on.
export type ServiceAPIError =
    | {code: "NOT_FOUND"}
    | {code: "RATE_LIMITED"}
    | {code: "UNAUTHORIZED"}
    | {code: "INVALID_REQUEST"}
    | {code: "SERVICE_API_ERROR"} // 5xx from upstream
    | {code: "UNEXPECTED_ERROR"}
```

**2. A wrapper that authenticates and maps failures onto those codes** (`src/<service>/wrap.ts`):

```ts
import {type AsyncResult, complete, errored} from "@attio/fetchable"
import {getWorkspaceConnection} from "attio/server"
import type {ServiceAPIError} from "./error"

const SERVICE_API_BASE_URL = "https://api.example.com/v1"

/** Single place mapping an upstream HTTP response onto our semantic errors. */
function mapStatusToError(status: number): ServiceAPIError {
    switch (status) {
        case 400:
            return {code: "INVALID_REQUEST"}
        case 401:
        case 403:
            return {code: "UNAUTHORIZED"}
        case 404:
            return {code: "NOT_FOUND"}
        case 429:
            return {code: "RATE_LIMITED"}
        default:
            return status >= 500 ? {code: "SERVICE_API_ERROR"} : {code: "UNEXPECTED_ERROR"}
    }
}

export async function wrapService(
    path: string,
    init: RequestInit = {}
): AsyncResult<unknown, ServiceAPIError> {
    // Throws an AttioError if the user hasn't connected. This powers the connection
    // dialog in the UI, so it MUST stay outside the try/catch below.
    const connection = getWorkspaceConnection()

    try {
        const response = await fetch(`${SERVICE_API_BASE_URL}${path}`, {
            ...init,
            headers: {
                authorization: `Bearer ${connection.value}`,
                "content-type": "application/json",
                ...init.headers,
            },
        })

        if (!response.ok) {
            return errored(mapStatusToError(response.status))
        }

        try {
            return complete(await response.json())
        } catch (error) {
            console.error("[service] failed to parse response body", error)
            return errored({code: "UNEXPECTED_ERROR"})
        }
    } catch (error) {
        console.error("[service] network error calling service API", error)
        return errored({code: "UNEXPECTED_ERROR"})
    }
}
```

**3. A typed client that validates responses with Zod** (`src/<service>/client.ts`):

```ts
import {type AsyncResult, bind, complete, errored} from "@attio/fetchable"
import {z} from "zod"
import type {ServiceAPIError} from "./error"
import {wrapService} from "./wrap"

// Only model the fields we actually use.
const WidgetSchema = z.object({id: z.string(), name: z.string()})
export type Widget = z.infer<typeof WidgetSchema>

export const service = {
    /** @see https://api.example.com/docs/widgets */
    async getWidget(id: string): AsyncResult<Widget, ServiceAPIError> {
        return bind(await wrapService(`/widgets/${id}`), (body) => {
            const parsed = WidgetSchema.safeParse(body)
            if (!parsed.success) {
                console.error("[service] unexpected widget shape", parsed.error)
                return errored({code: "UNEXPECTED_ERROR"})
            }
            return complete(parsed.data)
        })
    },
}
```

**4. A thin server-function controller** (`src/server-functions/get-widget.server.ts`):

```ts
import {service} from "../service/client"

export default async function getWidget(id: string) {
    return await service.getWidget(id)
}
```

**Paginated endpoints** must be bounded by a wall-clock budget so they stay under the
30s server timeout — accumulate pages in a loop and `break` once you exceed a
conservative budget (~10s), logging that you returned partial results.

## Validation

You MUST validate all your changes using the commands in `package.json`. CI runs the same checks on every PR.

- Validate formatting: `pnpm run format:check`
- Run and fix lint rules: `pnpm run lint:fix`
- Validate types: `pnpm run typecheck`
- Check for dead code: `pnpm run knip`
- Run tests: `pnpm run test`
