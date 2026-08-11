import {isErrored} from "@attio/fetchable"
import type {PlainComboboxOptionsProvider} from "attio/client"
import {showToast} from "attio/client"
import type {AsanaProject, AsanaUser, AsanaWorkspace} from "../asana/client"
import {type AsanaAPIError, asanaApiErrorUserMessage} from "../asana/error"
import getProject from "../server-functions/get-project.server"
import getUser from "../server-functions/get-user.server"
import getWorkspace from "../server-functions/get-workspace.server"
import listProjects from "../server-functions/list-projects.server"
import listUsers from "../server-functions/list-users.server"
import listWorkspaces from "../server-functions/list-workspaces.server"

function showSearchErrorToast(error: AsanaAPIError, subject: string) {
    showToast({
        title: `Could not load Asana ${subject}`,
        text: asanaApiErrorUserMessage(error),
        variant: "error",
        durationMs: 10_000,
    })
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
