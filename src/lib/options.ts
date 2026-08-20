import {isErrored} from "@attio/fetchable"
import type {PlainComboboxOptionsProvider} from "attio/client"
import type {AsanaProject, AsanaUser, AsanaWorkspace} from "../asana/client"
import {type AsanaAPIError, asanaApiErrorUserMessage} from "../asana/error"
import getProject from "../server-functions/get-project.server"
import getProjectTemplate from "../server-functions/get-project-template.server"
import getUser from "../server-functions/get-user.server"
import getWorkspace from "../server-functions/get-workspace.server"
import listProjects from "../server-functions/list-projects.server"
import listUsers from "../server-functions/list-users.server"
import listWorkspaces from "../server-functions/list-workspaces.server"
import searchProjectTemplates from "../server-functions/search-project-templates.server"
import {encodeRoleAssignee, decodeRoleAssignee} from "./role-assignee"
import {showAsanaErrorToast} from "./toast"

function showSearchErrorToast(error: AsanaAPIError, subject: string) {
    showAsanaErrorToast({subject, message: asanaApiErrorUserMessage(error)})
}

function formatNamedResourceOption(
    resource: Pick<AsanaWorkspace | AsanaProject | AsanaUser, "gid" | "name">
) {
    return {
        value: resource.gid,
        label: resource.name.length > 0 ? resource.name : resource.gid,
    }
}

export const provideWorkspaceOptions: PlainComboboxOptionsProvider = {
    search: async (query) => {
        const result = await listWorkspaces()

        if (isErrored(result)) {
            showSearchErrorToast(result.error, "workspaces")
            return []
        }

        const lowerQuery = query.trim().toLowerCase()

        return result.value
            .filter(
                (workspace) =>
                    lowerQuery.length === 0 || workspace.name.toLowerCase().includes(lowerQuery)
            )
            .map(formatNamedResourceOption)
    },
    getOption: async (value) => {
        const result = await getWorkspace(value)

        if (isErrored(result)) {
            showSearchErrorToast(result.error, "workspaces")
            return undefined
        }

        return formatNamedResourceOption(result.value)
    },
}

export function provideProjectOptions(
    workspaceGid: string | undefined
): PlainComboboxOptionsProvider {
    return {
        search: async (query) => {
            if (workspaceGid === undefined || workspaceGid === "") {
                return []
            }

            const result = await listProjects(workspaceGid)

            if (isErrored(result)) {
                showSearchErrorToast(result.error, "projects")
                return []
            }

            const lowerQuery = query.trim().toLowerCase()

            return result.value
                .filter(
                    (project) =>
                        lowerQuery.length === 0 || project.name.toLowerCase().includes(lowerQuery)
                )
                .map(formatNamedResourceOption)
        },
        getOption: async (value) => {
            const result = await getProject(value)

            if (isErrored(result)) {
                showSearchErrorToast(result.error, "projects")
                return undefined
            }

            return formatNamedResourceOption(result.value)
        },
    }
}

export function provideProjectTemplateOptions(
    workspaces: AsanaWorkspace[]
): PlainComboboxOptionsProvider {
    const workspaceNames = new Map(workspaces.map((workspace) => [workspace.gid, workspace.name]))

    // Which workspace a proj template came from only matters to a member who belongs to several. Keyed off
    // how many are searched rather than how many a given result set happens to span, so a row's
    // description does not come and go as the query changes.
    const showWorkspaceNames = workspaces.length > 1

    return {
        // Asana ranks and filters the results, so the query goes straight through.
        search: async (query) => {
            const result = await searchProjectTemplates(
                workspaces.map((workspace) => workspace.gid),
                query.trim()
            )

            if (isErrored(result)) {
                showSearchErrorToast(result.error, "project templates")
                return []
            }

            return result.value.map((template) => {
                const option = formatNamedResourceOption(template)
                const workspaceName = showWorkspaceNames
                    ? workspaceNames.get(template.workspaceGid)
                    : undefined
                return workspaceName === undefined
                    ? option
                    : {...option, description: workspaceName}
            })
        },
        // Deliberately silent on failure. This only runs when a template is already chosen, which
        // is exactly when the configurator fetches the same template to read its date variable —
        // and it reports the failure itself. Toasting here too would say the same thing twice.
        getOption: async (value) => {
            const result = await getProjectTemplate(value)

            return isErrored(result) ? undefined : formatNamedResourceOption(result.value)
        },
    }
}

/**
 * Users for one template role. The stored value carries the role's gid as well as the user's, so a
 * value left behind by a previously selected template names a role this one does not have and
 * resolves to nothing — rather than showing that template's user under this role's label.
 */
export function provideRoleAssigneeOptions({
    roleGid,
    workspaceGid,
}: {
    roleGid: string
    workspaceGid: string | undefined
}): PlainComboboxOptionsProvider {
    return {
        search: async (query) => {
            if (workspaceGid === undefined || workspaceGid === "") {
                return []
            }

            const result = await listUsers(workspaceGid)

            if (isErrored(result)) {
                showSearchErrorToast(result.error, "users")
                return []
            }

            const lowerQuery = query.trim().toLowerCase()

            return result.value
                .filter(
                    (user) =>
                        lowerQuery.length === 0 || user.name.toLowerCase().includes(lowerQuery)
                )
                .map((user) => ({
                    ...formatNamedResourceOption(user),
                    value: encodeRoleAssignee({roleGid, userGid: user.gid}),
                }))
        },
        // Silent on failure: a template can ask for several roles, and one toast per picker would
        // report the same outage repeatedly. A blank picker is recoverable — the member re-picks.
        getOption: async (value) => {
            const decoded = decodeRoleAssignee(value)

            if (decoded === undefined || decoded.roleGid !== roleGid) {
                return undefined
            }

            const result = await getUser(decoded.userGid)

            return isErrored(result) ? undefined : formatNamedResourceOption(result.value)
        },
    }
}

export function provideUserOptions(workspaceGid: string | undefined): PlainComboboxOptionsProvider {
    return {
        search: async (query) => {
            if (workspaceGid === undefined || workspaceGid === "") {
                return []
            }

            const result = await listUsers(workspaceGid)

            if (isErrored(result)) {
                showSearchErrorToast(result.error, "users")
                return []
            }

            const lowerQuery = query.trim().toLowerCase()

            return result.value
                .filter(
                    (user) =>
                        lowerQuery.length === 0 || user.name.toLowerCase().includes(lowerQuery)
                )
                .map(formatNamedResourceOption)
        },
        getOption: async (value) => {
            const result = await getUser(value)

            if (isErrored(result)) {
                showSearchErrorToast(result.error, "users")
                return undefined
            }

            return formatNamedResourceOption(result.value)
        },
    }
}
