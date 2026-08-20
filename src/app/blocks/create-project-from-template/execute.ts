import {isErrored} from "@attio/fetchable"
import {Workflows} from "attio/server"
import {asana} from "../../../asana/client"
import {type AsanaAPIError, asanaApiErrorUserMessage} from "../../../asana/error"
import block from "./block"
import {buildRequestedRoles} from "./roles"

/** Both Asana calls here fail the same way: report it, and retry only rate limits. */
function asanaCallFailed(error: AsanaAPIError) {
    return {
        type: "error" as const,
        errorMessage: asanaApiErrorUserMessage(error),
        retryable: error.code === "RATE_LIMITED",
    }
}

const execute: Workflows.WorkflowBlockExecute<typeof block.configSchema> =
    Workflows.defineWorkflowBlockExecute(block, async ({config}) => {
        // Asana rejects the instantiation unless every date the template asks for is supplied, and
        // neither the date variable gids nor the role gids are discoverable anywhere but the
        // template itself.
        const templateResult = await asana.getProjectTemplate(config.project_template_id)

        if (isErrored(templateResult)) {
            return asanaCallFailed(templateResult.error)
        }

        const {dateVariables, roles} = templateResult.value
        const templateDate = config.template_date?.value
        const assignees = (config.template_roles ?? []).map((role) => role.assignee)

        if (dateVariables.length > 0 && templateDate === undefined) {
            return {
                type: "error",
                // Name the date as Asana names it.
                errorMessage: `This Asana project template asks for a date (${dateVariables[0].name}). Set it on this step and try again.`,
                retryable: false,
            }
        }

        const result = await asana.instantiateProject({
            projectTemplateGid: config.project_template_id,
            name: config.name,
            // The step collects one date, so every variable the template asks for is bound to it.
            // The empty branch only narrows the type — the guard above already rejected a template
            // that asks for a date without one being set.
            requestedDates:
                templateDate === undefined
                    ? []
                    : dateVariables.map((variable) => ({gid: variable.gid, value: templateDate})),
            requestedRoles: buildRequestedRoles({roles, assignees}),
        })

        if (isErrored(result)) {
            return asanaCallFailed(result.error)
        }

        return {
            type: "outcome",
            id: "created",
            data: {
                project_id: result.value.gid,
            },
        }
    })

export default execute
