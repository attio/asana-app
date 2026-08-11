import {Workflows} from "attio"
import {PRIVACY_SETTINGS} from "../../../asana/task-fields"

export default Workflows.defineWorkflowBlock({
    type: "step",
    id: "create-task",
    title: "Create task",
    description: "Create a task in Asana",
    requireUserConnection: true,
    configSchema: Workflows.ConfigSchema.struct({
        name: Workflows.ConfigSchema.string(),
        workspace_id: Workflows.ConfigSchema.string(),
        privacy_setting: Workflows.ConfigSchema.stringEnum([...PRIVACY_SETTINGS]),
        due_on: Workflows.ConfigSchema.date().optional(),
        assignee: Workflows.ConfigSchema.string().optional(),
        projects: Workflows.ConfigSchema.array(
            Workflows.ConfigSchema.struct({
                gid: Workflows.ConfigSchema.string(),
            })
        ),
    }),
})
