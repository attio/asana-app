import {isErrored} from "@attio/fetchable"
import {useAsyncCache, Workflows} from "attio/client"
import {useEffect} from "react"
import type {AsanaWorkspace} from "../../../asana/client"
import {asanaApiErrorUserMessage} from "../../../asana/error"
import {provideProjectTemplateOptions, provideRoleAssigneeOptions} from "../../../lib/options"
import {showAsanaErrorToast} from "../../../lib/toast"
import getProjectTemplateWithWorkspace from "../../../server-functions/get-project-template-with-workspace.server"
import listWorkspaces from "../../../server-functions/list-workspaces.server"
import block from "./block"

function TemplateComboboxInput({help, workspaces}: {help?: string; workspaces: AsanaWorkspace[]}) {
    const {ComboboxInput} = Workflows.useConfigurator(block)

    return (
        <ComboboxInput
            name="project_template_id"
            label="Project template"
            help={help}
            placeholder="Search Asana project templates…"
            searchPlaceholder="Search Asana project templates…"
            disableVariables // Nothing upstream produces an Asana project template gid
            options={provideProjectTemplateOptions(workspaces)}
        />
    )
}

function SelectedTemplate({
    projectTemplateGid,
    workspaces,
}: {
    projectTemplateGid: string
    workspaces: AsanaWorkspace[]
}) {
    const {ComboboxInput, DateInput} = Workflows.useConfigurator(block)

    // Key by template so picking a different one refetches.
    const cacheKey = `project-template-${projectTemplateGid}`
    const {values, invalidate} = useAsyncCache({
        [cacheKey]: [getProjectTemplateWithWorkspace, projectTemplateGid],
    })
    const result = values[cacheKey]

    const errorMessage = isErrored(result) ? asanaApiErrorUserMessage(result.error) : undefined

    useEffect(() => {
        if (errorMessage === undefined) {
            return
        }

        showAsanaErrorToast({subject: "project template", message: errorMessage})

        // Drop the errored result so the next mount retries instead of serving the cached failure.
        return () => invalidate(cacheKey)
    }, [cacheKey, errorMessage, invalidate])

    if (isErrored(result)) {
        return <TemplateComboboxInput workspaces={workspaces} />
    }

    const {template, workspace} = result.value

    // A template's schedule type is either "after project start date" or "before project due date"
    // — one or the other, never both — so it asks for exactly one date, and every task is scheduled
    // relative to it. Asana's name for the variable is what says which of the two it is, so that
    // name becomes the input's label.
    const dateVariable = template.dateVariables[0]

    return (
        <>
            <TemplateComboboxInput
                help={
                    workspace === undefined
                        ? undefined
                        : `This project will be created in the ${workspace.name} workspace.`
                }
                workspaces={workspaces}
            />
            {dateVariable !== undefined && (
                <DateInput
                    name="template_date"
                    label={dateVariable.name}
                    help="Required by this template. Asana schedules its tasks relative to this date."
                />
            )}
            {/*
             * A template can assign its tasks to placeholder roles instead of people. One picker
             * per role, labelled and ordered as Asana returns them, so a template can add, rename
             * or drop a role without a change here.
             */}
            {template.roles.map((role, index) => (
                <ComboboxInput
                    key={role.gid}
                    name={`template_roles.${index}.assignee`}
                    label={role.name}
                    help={
                        workspace === undefined
                            ? "Asana returned no workspace for this template, so its users cannot be listed. Insert a user ID from an earlier step instead."
                            : "Tasks the template assigns to this role go to the user you pick."
                    }
                    placeholder={
                        workspace === undefined ? "No users to search" : "Search Asana users…"
                    }
                    searchPlaceholder={
                        workspace === undefined ? "No users to search" : "Search Asana users…"
                    }
                    options={provideRoleAssigneeOptions({
                        roleGid: role.gid,
                        workspaceGid: workspace?.gid,
                    })}
                />
            ))}
        </>
    )
}

/** The template field, plus whatever the chosen template turns out to ask for. */
function TemplateFields({
    projectTemplateGid,
    workspaces,
}: {
    projectTemplateGid: string | undefined
    workspaces: AsanaWorkspace[]
}) {
    return projectTemplateGid === undefined ? (
        <TemplateComboboxInput workspaces={workspaces} />
    ) : (
        <SelectedTemplate projectTemplateGid={projectTemplateGid} workspaces={workspaces} />
    )
}

export default Workflows.defineConfigurator(block, (workflowBlock) => {
    const {TextInput, Outcome, watch} = Workflows.useConfigurator(workflowBlock)

    // Asana searches project templates one workspace at a time, so search covers all of the
    // member's. There is deliberately no workspace field: it could only narrow this search, and a
    // saved one would go stale and imply a destination the project is not created in.
    const {
        values: {workspacesResult},
        invalidate,
    } = useAsyncCache({workspacesResult: listWorkspaces})

    const templateConfig = watch("project_template_id")
    const projectTemplateGid =
        templateConfig?.type === "static" && templateConfig.value !== ""
            ? templateConfig.value
            : undefined

    const errorMessage = isErrored(workspacesResult)
        ? asanaApiErrorUserMessage(workspacesResult.error)
        : undefined

    useEffect(() => {
        if (errorMessage === undefined) {
            return
        }

        showAsanaErrorToast({subject: "workspaces", message: errorMessage})

        // Drop the errored result so the next mount retries instead of serving the cached failure.
        return () => invalidate("workspacesResult")
    }, [errorMessage, invalidate])

    return (
        <>
            <TextInput name="name" label="Project name" />
            {isErrored(workspacesResult) ? (
                // Nothing to search without workspaces. The toast above says why.
                <TemplateComboboxInput workspaces={[]} />
            ) : (
                <TemplateFields
                    projectTemplateGid={projectTemplateGid}
                    workspaces={workspacesResult.value}
                />
            )}
            <Outcome
                id="created"
                label="Created"
                schema={Workflows.OutcomeSchema.struct({
                    project_id: Workflows.OutcomeSchema.string().title("Project ID"),
                })}
            />
        </>
    )
})
