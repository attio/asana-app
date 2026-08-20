import {
    type AsyncResult,
    bind,
    combineAsync,
    complete,
    errored,
    isErrored,
    map,
} from "@attio/fetchable"
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

const InstantiateProjectResponseSchema = z.object({
    data: z.object({
        new_project: z.object({gid: z.string()}).nullable().optional(),
    }),
})

const ProjectTemplateDateVariableSchema = z.object({
    gid: z.string(),
    name: z.string(),
})

const ProjectTemplateResponseSchema = z.object({
    data: z.object({
        gid: z.string(),
        name: z.string(),
        requested_dates: z.array(ProjectTemplateDateVariableSchema).nullable().optional(),
        requested_roles: z.array(CompactNamedResourceSchema).nullable().optional(),
        team: z.object({gid: z.string()}).nullable().optional(),
    }),
})

const TeamOrganizationResponseSchema = z.object({
    data: z.object({
        organization: CompactNamedResourceSchema.nullable().optional(),
    }),
})

export type AsanaProjectTemplateSearchResult = {
    gid: string
    name: string
    /** Which workspace the hit came from, so the picker can tell duplicates apart. */
    workspaceGid: string
}

export type AsanaProjectTemplate = {
    gid: string
    name: string
    /** The dates the template asks for. Asana requires a value for each when instantiating. */
    dateVariables: Array<z.infer<typeof ProjectTemplateDateVariableSchema>>
    /**
     * The placeholder roles the template assigns tasks to ("Tech Lead", "Designer"), in the order
     * Asana returns them. Asana's UI calls these variable assignees. Mapping one to a user is
     * optional — a role left unmapped leaves its tasks unassigned.
     */
    roles: Array<z.infer<typeof CompactNamedResourceSchema>>
    /**
     * A template carries no workspace of its own, only a team — the sole route from a template to
     * where its projects are created. Optional in Asana's response.
     * @see https://developers.asana.com/reference/getprojecttemplate
     */
    teamGid: string | undefined
}

const PAGINATION_TIME_LIMIT_MS = 10_000
const PAGE_LIMIT = 100

// The typeahead endpoint returns a single page and cannot be paginated, so this is the whole
// result set. Kept short deliberately: members narrow it by typing rather than by scrolling.
const TYPEAHEAD_COUNT = 10

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

function buildProjectTemplateTypeaheadPath({
    workspace,
    query,
}: {
    workspace: string
    query: string
}): string {
    const params = new URLSearchParams({
        resource_type: "project_template",
        count: String(TYPEAHEAD_COUNT),
        opt_fields: "name",
    })
    if (query !== "") {
        params.set("query", query)
    }
    return `/workspaces/${encodeURIComponent(workspace)}/typeahead?${params.toString()}`
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

async function searchWorkspaceProjectTemplates({
    workspaceGid,
    query,
}: {
    workspaceGid: string
    query: string
}): AsyncResult<AsanaProjectTemplateSearchResult[], AsanaAPIError> {
    return bind(
        await wrapAsana(buildProjectTemplateTypeaheadPath({workspace: workspaceGid, query})),
        (body) => {
            const parsed = ListCompactNamedResourcesResponseSchema.safeParse(body)
            if (!parsed.success) {
                console.error(
                    "[asana] unexpected project template typeahead response shape",
                    parsed.error
                )
                return errored({code: "UNEXPECTED_ERROR"})
            }
            return complete(parsed.data.data.map((template) => ({...template, workspaceGid})))
        }
    )
}

/**
 * @see https://developers.asana.com/reference/getteam
 */
async function getTeamOrganization(
    teamGid: string
): AsyncResult<AsanaWorkspace | undefined, AsanaAPIError> {
    const params = new URLSearchParams({opt_fields: "organization,organization.name"})
    return bind(
        await wrapAsana(`/teams/${encodeURIComponent(teamGid)}?${params.toString()}`),
        (body) => {
            const parsed = TeamOrganizationResponseSchema.safeParse(body)
            if (!parsed.success) {
                console.error("[asana] unexpected get team response shape", parsed.error)
                return errored({code: "UNEXPECTED_ERROR"})
            }
            return complete(parsed.data.data.organization ?? undefined)
        }
    )
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

    /**
     * Searches every workspace the member belongs to in order to find templates, because `/project_templates` accepts no
     * workspace-less listing and typeahead takes one workspace at a time.
     *
     * @see https://developers.asana.com/reference/typeaheadforworkspace
     */
    async searchProjectTemplates({
        workspaceGids,
        query,
    }: {
        workspaceGids: string[]
        query: string
    }): AsyncResult<AsanaProjectTemplateSearchResult[], AsanaAPIError> {
        return map(
            await combineAsync(
                workspaceGids.map((workspaceGid) =>
                    searchWorkspaceProjectTemplates({workspaceGid, query})
                )
            ),
            (perWorkspace) => perWorkspace.flat()
        )
    },

    /**
     * @see https://developers.asana.com/reference/getprojecttemplate
     */
    async getProjectTemplate(
        projectTemplateGid: string
    ): AsyncResult<AsanaProjectTemplate, AsanaAPIError> {
        const params = new URLSearchParams({
            opt_fields:
                "name,requested_dates,requested_dates.name,requested_roles,requested_roles.name,team",
        })
        return bind(
            await wrapAsana(
                `/project_templates/${encodeURIComponent(projectTemplateGid)}?${params.toString()}`
            ),
            (body) => {
                const parsed = ProjectTemplateResponseSchema.safeParse(body)
                if (!parsed.success) {
                    console.error(
                        "[asana] unexpected get project template response shape",
                        parsed.error
                    )
                    return errored({code: "UNEXPECTED_ERROR"})
                }
                const {gid, name, requested_dates, requested_roles, team} = parsed.data.data
                return complete({
                    gid,
                    name,
                    dateVariables: requested_dates ?? [],
                    roles: requested_roles ?? [],
                    teamGid: team?.gid,
                })
            }
        )
    },

    /**
     * The template plus the workspace its projects land in, for the configurator to show. Asana
     * returns the team as an optional field, so the workspace is best-effort: with no team there
     * is no route to it.
     */
    async getProjectTemplateWithWorkspace(projectTemplateGid: string): AsyncResult<
        {
            template: AsanaProjectTemplate
            workspace: AsanaWorkspace | undefined
        },
        AsanaAPIError
    > {
        const templateResult = await this.getProjectTemplate(projectTemplateGid)

        if (isErrored(templateResult)) {
            return templateResult
        }

        const {teamGid} = templateResult.value
        if (teamGid === undefined) {
            return complete({template: templateResult.value, workspace: undefined})
        }

        return bind(await getTeamOrganization(teamGid), (workspace) =>
            complete({template: templateResult.value, workspace})
        )
    },

    /**
     * `team` is left unset: Asana can only instantiate a template within its own organization, so
     * the template alone decides where the project lands.
     *
     * @see https://developers.asana.com/reference/instantiateproject
     */
    async instantiateProject({
        projectTemplateGid,
        name,
        requestedDates,
        requestedRoles,
    }: {
        projectTemplateGid: string
        name: string
        requestedDates: Array<{gid: string; value: string}>
        requestedRoles: Array<{gid: string; value: string}>
    }): AsyncResult<CreatedResource, AsanaAPIError> {
        return bind(
            await wrapAsana(
                `/project_templates/${encodeURIComponent(projectTemplateGid)}/instantiateProject`,
                {
                    method: "POST",
                    body: JSON.stringify({
                        data: {
                            name,
                            ...(requestedDates.length > 0 ? {requested_dates: requestedDates} : {}),
                            ...(requestedRoles.length > 0 ? {requested_roles: requestedRoles} : {}),
                        },
                    }),
                }
            ),
            (body) => {
                const parsed = InstantiateProjectResponseSchema.safeParse(body)
                if (!parsed.success) {
                    console.error(
                        "[asana] unexpected instantiate project response shape",
                        parsed.error
                    )
                    return errored({code: "UNEXPECTED_ERROR"})
                }
                const newProject = parsed.data.data.new_project
                if (newProject === null || newProject === undefined) {
                    console.error(
                        "[asana] instantiate project job did not include new_project",
                        parsed.data.data
                    )
                    return errored({code: "UNEXPECTED_ERROR"})
                }
                return complete({gid: newProject.gid})
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
