import {Workflows} from "attio/client"
import {provideUserOptions, provideWorkspaceOptions} from "../../../lib/options"
import block from "./block"
import {
    DEFAULT_ACCESS_LEVEL_OPTIONS,
    MINIMUM_ACCESS_LEVEL_OPTIONS,
    PROJECT_COLOR_OPTIONS,
    PROJECT_ICON_OPTIONS,
} from "./options"

export default Workflows.defineConfigurator(block, (workflowBlock) => {
    const {TextInput, ComboboxInput, DateInput, Outcome, watch} =
        Workflows.useConfigurator(workflowBlock)

    const workspaceConfig = watch("workspace_id")
    const workspaceGid =
        workspaceConfig?.type === "static" && workspaceConfig.value !== ""
            ? workspaceConfig.value
            : undefined

    return (
        <>
            <TextInput name="name" label="Project name" />
            <ComboboxInput
                name="workspace_id"
                label="Workspace"
                help="Search for a workspace, or insert a workspace id from an earlier step."
                placeholder="Search Asana workspaces…"
                searchPlaceholder="Search Asana workspaces…"
                options={provideWorkspaceOptions}
            />
            <DateInput
                name="start_on"
                label="Start date"
                help="If set, a due date is also required and the start date must fall before it."
            />
            <DateInput name="due_on" label="Due date" />
            <ComboboxInput
                name="owner_id"
                label="Owner"
                help={
                    workspaceGid
                        ? "Search for an Asana user, or insert a user id or email address from an earlier step."
                        : "Choose a workspace above to load its users, or insert a user id or email address from an earlier step."
                }
                placeholder={workspaceGid ? "Search Asana users…" : "Select a workspace first"}
                searchPlaceholder={
                    workspaceGid ? "Search Asana users…" : "Select a workspace first"
                }
                options={provideUserOptions(workspaceGid)}
            />
            <ComboboxInput
                name="color"
                label="Color"
                placeholder="Select a color…"
                searchPlaceholder="Search colors…"
                disableVariables
                options={PROJECT_COLOR_OPTIONS}
            />
            <ComboboxInput
                name="icon"
                label="Icon"
                placeholder="Select an icon…"
                searchPlaceholder="Search icons…"
                disableVariables
                options={PROJECT_ICON_OPTIONS}
            />
            <ComboboxInput
                name="default_access_level"
                label="Default access level"
                help="Default access for users or teams who join or are added as members."
                disableVariables
                disableSearch
                options={DEFAULT_ACCESS_LEVEL_OPTIONS}
            />
            <ComboboxInput
                name="minimum_access_level_for_customization"
                label="Minimum access for customization"
                help="Minimum access needed to modify this project's workflow and appearance."
                disableVariables
                disableSearch
                options={MINIMUM_ACCESS_LEVEL_OPTIONS}
            />
            <ComboboxInput
                name="minimum_access_level_for_sharing"
                label="Minimum access for sharing"
                help="Minimum access needed to share the project and manage memberships."
                disableVariables
                disableSearch
                options={MINIMUM_ACCESS_LEVEL_OPTIONS}
            />
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
