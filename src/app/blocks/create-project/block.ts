import {Workflows} from "attio"
import {
    DEFAULT_ACCESS_LEVELS,
    MINIMUM_ACCESS_LEVELS,
    PROJECT_COLORS,
    PROJECT_ICONS,
} from "../../../asana/project-fields"

export default Workflows.defineWorkflowBlock({
    type: "step",
    id: "create-project",
    title: "Create project",
    description: "Create a project in Asana",
    requireUserConnection: true,
    configSchema: Workflows.ConfigSchema.struct({
        name: Workflows.ConfigSchema.string(),
        workspace_id: Workflows.ConfigSchema.string(),
        due_on: Workflows.ConfigSchema.date().optional(),
        start_on: Workflows.ConfigSchema.date().optional(),
        default_access_level: Workflows.ConfigSchema.stringEnum([
            ...DEFAULT_ACCESS_LEVELS,
        ]).optional(),
        minimum_access_level_for_customization: Workflows.ConfigSchema.stringEnum([
            ...MINIMUM_ACCESS_LEVELS,
        ]).optional(),
        minimum_access_level_for_sharing: Workflows.ConfigSchema.stringEnum([
            ...MINIMUM_ACCESS_LEVELS,
        ]).optional(),
        owner_id: Workflows.ConfigSchema.string().optional(),
        color: Workflows.ConfigSchema.stringEnum([...PROJECT_COLORS]).optional(),
        icon: Workflows.ConfigSchema.stringEnum([...PROJECT_ICONS]).optional(),
    }),
})
