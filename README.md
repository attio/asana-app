# Asana

Attio app integrating with [Asana](https://asana.com/) — create Asana tasks and projects directly from Attio workflows.

## What it does

- **Create task** — workflow step that creates an Asana task with a name, workspace, required privacy setting, and zero or more associated projects
- **Create project** — workflow step that creates an Asana project with a name, workspace, and optional due/start dates, owner, color, icon, and access-level settings

Configurators load workspaces, projects, and users from the Asana API (paginated, with a time budget) and present them as searchable dropdowns. Project options on the create-task block and user options on the create-project block are scoped to the selected workspace.

## Setup

```bash
pnpm install
```

## Development

```bash
pnpm run dev
```

## Commands

| Command                 | Description              |
| ----------------------- | ------------------------ |
| `pnpm run dev`          | Start dev server         |
| `pnpm run build`        | Build + type-check       |
| `pnpm run lint`         | Run ESLint               |
| `pnpm run lint:fix`     | Run ESLint with auto-fix |
| `pnpm run format`       | Format with Prettier     |
| `pnpm run format:check` | Check formatting         |
| `pnpm run test`         | Run tests                |
| `pnpm run knip`         | Check for dead code      |

## Structure

| Path | Description |
| --- | --- |
| `src/app/blocks/create-task/` | Create-task workflow block (block, configurator, execute) |
| `src/app/blocks/create-project/` | Create-project workflow block (block, configurator, execute) |
| `src/asana/` | Asana API client, wrap layer, and error types |
| `src/server-functions/` | Thin server functions for listing/getting workspaces, projects, and users |
| `src/lib/` | Combobox option providers for the configurator |

See [AGENTS.md](./AGENTS.md) for full coding guidelines and SDK usage notes.
