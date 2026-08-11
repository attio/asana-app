import {Workflows} from "attio/client"
import {
    provideProjectOptions,
    provideUserOptions,
    provideWorkspaceOptions,
} from "../../../lib/options"
import block from "./block"
import {PRIVACY_SETTING_OPTIONS} from "./options"

export default Workflows.defineConfigurator(block, (workflowBlock) => {
    const {TextInput, ComboboxInput, CollectionInput, DateInput, Outcome, watch} =
        Workflows.useConfigurator(workflowBlock)

    const workspaceConfig = watch("workspace_id")
    const workspaceGid =
        workspaceConfig?.type === "static" && workspaceConfig.value !== ""
            ? workspaceConfig.value
            : undefined

    return (
        <>
            <TextInput name="name" label="Task name" />
            <ComboboxInput
                name="workspace_id"
                label="Workspace"
                help="Search for a workspace, or insert a workspace id from an earlier step."
                placeholder="Search Asana workspaces…"
                searchPlaceholder="Search Asana workspaces…"
                options={provideWorkspaceOptions}
            />
            <DateInput name="due_on" label="Due date" />
            <ComboboxInput
                name="assignee"
                label="Assignee"
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
            <CollectionInput
                name="projects"
                label="Projects"
                addItemLabel="Add project"
                minItems={0}
            >
                {(item) => (
                    <>
                        <ComboboxInput
                            name={`${item}.gid`}
                            label="Associated project"
                            help={
                                workspaceGid
                                    ? "Search for an Asana project, or insert a project id from an earlier step."
                                    : "Choose a workspace above to load its projects, or insert a project id from an earlier step."
                            }
                            placeholder={
                                workspaceGid ? "Search Asana projects…" : "Select a workspace first"
                            }
                            searchPlaceholder={
                                workspaceGid ? "Search Asana projects…" : "Select a workspace first"
                            }
                            options={provideProjectOptions(workspaceGid)}
                        />
                    </>
                )}
            </CollectionInput>
            <ComboboxInput
                name="privacy_setting"
                label="Privacy setting"
                disableVariables
                disableSearch
                options={PRIVACY_SETTING_OPTIONS}
            />
            <Outcome
                id="created"
                label="Created"
                schema={Workflows.OutcomeSchema.struct({
                    task_id: Workflows.OutcomeSchema.string().title("Task ID"),
                })}
            />
        </>
    )
})
