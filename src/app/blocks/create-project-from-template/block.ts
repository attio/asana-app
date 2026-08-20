import {Workflows} from "attio"

export default Workflows.defineWorkflowBlock({
    type: "step",
    id: "create-project-from-template",
    title: "Create project from template",
    description: "Create a project in Asana from a project template",
    requireUserConnection: true,
    configSchema: Workflows.ConfigSchema.struct({
        name: Workflows.ConfigSchema.string(),
        project_template_id: Workflows.ConfigSchema.string(),
        /** The date the template asks for, if it asks for one. Named by the template, not by us. */
        template_date: Workflows.ConfigSchema.date().optional(),
        /**
         * The roles a template asks for, if it asks for any. A template can assign its tasks to a
         * role rather than to a person, so the configurator maps each role to an Asana user — one
         * entry here per role, in the order Asana returns them.
         *
         * Adding `.optional()` here causes a save error the moment a user is picked: an optional
         * array is "a list or nothing", and the editor cannot read item 0 of nothing.
         */
        template_roles: Workflows.ConfigSchema.array(
            Workflows.ConfigSchema.struct({
                assignee: Workflows.ConfigSchema.string().optional(),
            })
        ),
    }),
})
