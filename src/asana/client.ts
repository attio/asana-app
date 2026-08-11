import {type AsyncResult, bind, complete, errored, isErrored} from "@attio/fetchable"
import {z} from "zod"
import type {AsanaAPIError} from "./error"
import type {
    AsanaDefaultAccessLevel,
    AsanaMinimumAccessLevel,
    AsanaProjectColor,
    AsanaProjectIcon,
} from "./project-fields"
import type {AsanaTaskPrivacySetting} from "./task-fields"
import {wrapAsana} from "./wrap"

export type {
    AsanaDefaultAccessLevel,
    AsanaMinimumAccessLevel,
    AsanaProjectColor,
    AsanaProjectIcon,
} from "./project-fields"
export type {AsanaTaskPrivacySetting} from "./task-fields"

const CreatedResourceResponseSchema = z.object({
    data: z.object({
        gid: z.string(),
    }),
})

export type CreatedResource = z.infer<typeof CreatedResourceResponseSchema>["data"]

const CompactNamedResourceSchema = z.object({
    gid: z.string(),
    name: z.string(),
})

export type AsanaWorkspace = z.infer<typeof CompactNamedResourceSchema>
export type AsanaProject = z.infer<typeof CompactNamedResourceSchema>
export type AsanaUser = z.infer<typeof CompactNamedResourceSchema>

const CompactNamedResourceResponseSchema = z.object({
    data: CompactNamedResourceSchema,
})

const ListCompactNamedResourcesResponseSchema = z.object({
    data: z.array(CompactNamedResourceSchema),
    next_page: z
        .object({
            offset: z.string(),
        })
        .nullable()
        .optional(),
})

const PAGINATION_TIME_LIMIT_MS = 10_000
const PAGE_LIMIT = 100

function buildWorkspacesPath(offset?: string): string {
    const params = new URLSearchParams({
        limit: String(PAGE_LIMIT),
        opt_fields: "name",
    })
    if (offset !== undefined) {
        params.set("offset", offset)
    }
    return `/workspaces?${params.toString()}`
}

function buildProjectsPath({workspace, offset}: {workspace: string; offset?: string}): string {
    const params = new URLSearchParams({
        workspace,
        archived: "false",
        limit: String(PAGE_LIMIT),
        opt_fields: "name",
    })
    if (offset !== undefined) {
        params.set("offset", offset)
    }
    return `/projects?${params.toString()}`
}

function buildUsersPath({workspace, offset}: {workspace: string; offset?: string}): string {
    const params = new URLSearchParams({
        workspace,
        limit: String(PAGE_LIMIT),
        opt_fields: "name",
    })
    if (offset !== undefined) {
        params.set("offset", offset)
    }
    return `/users?${params.toString()}`
}

async function listPaginatedCompactResources({
    buildPath,
    resourceLabel,
}: {
    buildPath: (offset: string | undefined) => string
    resourceLabel: string
}): AsyncResult<Array<z.infer<typeof CompactNamedResourceSchema>>, AsanaAPIError> {
    const resources: Array<z.infer<typeof CompactNamedResourceSchema>> = []
    let offset: string | undefined
    let requestCount = 0
    const startedAt = Date.now()

    while (true) {
        const responseResult = await wrapAsana(buildPath(offset))

        if (isErrored(responseResult)) {
            return responseResult
        }

        const parsed = ListCompactNamedResourcesResponseSchema.safeParse(responseResult.value)
        if (!parsed.success) {
            console.error(`[asana] unexpected list ${resourceLabel} response shape`, parsed.error)
            return errored({code: "UNEXPECTED_ERROR"})
        }

        resources.push(...parsed.data.data)
        requestCount++

        const nextOffset = parsed.data.next_page?.offset
        if (nextOffset === undefined) {
            break
        }
        offset = nextOffset

        const elapsedMs = Date.now() - startedAt
        if (elapsedMs > PAGINATION_TIME_LIMIT_MS) {
            console.warn(
                `[asana] ${resourceLabel} pagination time budget of ${PAGINATION_TIME_LIMIT_MS}ms exceeded after ` +
                    `${requestCount} request(s) (${elapsedMs}ms elapsed, ${resources.length} results); ` +
                    `returning partial results`
            )
            break
        }
    }

    return complete(resources)
}

export const asana = {
    /**
     * @see https://developers.asana.com/reference/getworkspaces
     */
    async listWorkspaces(): AsyncResult<AsanaWorkspace[], AsanaAPIError> {
        return listPaginatedCompactResources({
            buildPath: buildWorkspacesPath,
            resourceLabel: "workspaces",
        })
    },

    /**
     * @see https://developers.asana.com/reference/getworkspace
     */
    async getWorkspace(workspaceGid: string): AsyncResult<AsanaWorkspace, AsanaAPIError> {
        const params = new URLSearchParams({opt_fields: "name"})
        return bind(
            await wrapAsana(`/workspaces/${encodeURIComponent(workspaceGid)}?${params.toString()}`),
            (body) => {
                const parsed = CompactNamedResourceResponseSchema.safeParse(body)
                if (!parsed.success) {
                    console.error("[asana] unexpected get workspace response shape", parsed.error)
                    return errored({code: "UNEXPECTED_ERROR"})
                }
                return complete(parsed.data.data)
            }
        )
    },

    /**
     * @see https://developers.asana.com/reference/getprojects
     */
    async listProjects({
        workspace,
    }: {
        workspace: string
    }): AsyncResult<AsanaProject[], AsanaAPIError> {
        return listPaginatedCompactResources({
            buildPath: (offset) => buildProjectsPath({workspace, offset}),
            resourceLabel: "projects",
        })
    },

    /**
     * @see https://developers.asana.com/reference/getproject
     */
    async getProject(projectGid: string): AsyncResult<AsanaProject, AsanaAPIError> {
        const params = new URLSearchParams({opt_fields: "name"})
        return bind(
            await wrapAsana(`/projects/${encodeURIComponent(projectGid)}?${params.toString()}`),
            (body) => {
                const parsed = CompactNamedResourceResponseSchema.safeParse(body)
                if (!parsed.success) {
                    console.error("[asana] unexpected get project response shape", parsed.error)
                    return errored({code: "UNEXPECTED_ERROR"})
                }
                return complete(parsed.data.data)
            }
        )
    },

    /**
     * @see https://developers.asana.com/reference/getusers
     */
    async listUsers({workspace}: {workspace: string}): AsyncResult<AsanaUser[], AsanaAPIError> {
        return listPaginatedCompactResources({
            buildPath: (offset) => buildUsersPath({workspace, offset}),
            resourceLabel: "users",
        })
    },

    /**
     * @see https://developers.asana.com/reference/getuser
     */
    async getUser(userGid: string): AsyncResult<AsanaUser, AsanaAPIError> {
        const params = new URLSearchParams({opt_fields: "name"})
        return bind(
            await wrapAsana(`/users/${encodeURIComponent(userGid)}?${params.toString()}`),
            (body) => {
                const parsed = CompactNamedResourceResponseSchema.safeParse(body)
                if (!parsed.success) {
                    console.error("[asana] unexpected get user response shape", parsed.error)
                    return errored({code: "UNEXPECTED_ERROR"})
                }
                return complete(parsed.data.data)
            }
        )
    },

    /** @see https://developers.asana.com/reference/createtask */
    async createTask({
        name,
        workspace,
        privacy_setting,
        due_on,
        assignee,
        projects,
    }: {
        name: string
        workspace: string
        privacy_setting?: AsanaTaskPrivacySetting
        /** The localized date on which this task is due, or null if the task has no due date. Format: YYYY-MM-DD. */
        due_on?: string | null
        /** The gid or email address of a user to assign the task to, or null for no assignee. */
        assignee?: string | null
        projects?: Array<string>
    }): AsyncResult<CreatedResource, AsanaAPIError> {
        return bind(
            await wrapAsana("/tasks", {
                method: "POST",
                body: JSON.stringify({
                    data: {
                        name,
                        workspace,
                        ...(privacy_setting !== undefined ? {privacy_setting} : {}),
                        ...(due_on !== undefined ? {due_on} : {}),
                        ...(assignee !== undefined ? {assignee} : {}),
                        ...(projects !== undefined && projects.length > 0 ? {projects} : {}),
                    },
                }),
            }),
            (body) => {
                const parsed = CreatedResourceResponseSchema.safeParse(body)
                if (!parsed.success) {
                    console.error("[asana] unexpected create task response shape", parsed.error)
                    return errored({code: "UNEXPECTED_ERROR"})
                }
                return complete(parsed.data.data)
            }
        )
    },

    /** @see https://developers.asana.com/reference/createproject */
    async createProject({
        name,
        workspace,
        due_on,
        start_on,
        default_access_level,
        minimum_access_level_for_customization,
        minimum_access_level_for_sharing,
        owner,
        color,
        icon,
    }: {
        name: string
        workspace: string
        due_on?: string
        start_on?: string
        default_access_level?: AsanaDefaultAccessLevel
        minimum_access_level_for_customization?: AsanaMinimumAccessLevel
        minimum_access_level_for_sharing?: AsanaMinimumAccessLevel
        /** The gid or email address of a user to set as the project owner. */
        owner?: string
        color?: AsanaProjectColor
        icon?: AsanaProjectIcon
    }): AsyncResult<CreatedResource, AsanaAPIError> {
        return bind(
            await wrapAsana("/projects", {
                method: "POST",
                body: JSON.stringify({
                    data: {
                        name,
                        workspace,
                        ...(due_on !== undefined ? {due_on} : {}),
                        ...(start_on !== undefined ? {start_on} : {}),
                        ...(default_access_level !== undefined ? {default_access_level} : {}),
                        ...(minimum_access_level_for_customization !== undefined
                            ? {minimum_access_level_for_customization}
                            : {}),
                        ...(minimum_access_level_for_sharing !== undefined
                            ? {minimum_access_level_for_sharing}
                            : {}),
                        ...(owner !== undefined ? {owner} : {}),
                        ...(color !== undefined ? {color} : {}),
                        ...(icon !== undefined ? {icon} : {}),
                    },
                }),
            }),
            (body) => {
                const parsed = CreatedResourceResponseSchema.safeParse(body)
                if (!parsed.success) {
                    console.error("[asana] unexpected create project response shape", parsed.error)
                    return errored({code: "UNEXPECTED_ERROR"})
                }
                return complete(parsed.data.data)
            }
        )
    },
}
