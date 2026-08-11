import {isErrored} from "@attio/fetchable"
import {Workflows} from "attio/server"
import {asana} from "../../../asana/client"
import {asanaApiErrorUserMessage} from "../../../asana/error"
import block from "./block"

function optionalNonEmptyString(value: string | undefined): string | undefined {
    if (value === undefined || value === "") {
        return undefined
    }
    return value
}

const execute: Workflows.WorkflowBlockExecute<typeof block.configSchema> =
    Workflows.defineWorkflowBlockExecute(block, async ({config}) => {
        const dueOn = config.due_on?.value
        const startOn = config.start_on?.value

        if (startOn !== undefined && dueOn === undefined) {
            return {
                type: "error",
                errorMessage: "A due date is required when setting a start date.",
                retryable: false,
            }
        }

        if (startOn !== undefined && dueOn !== undefined && startOn === dueOn) {
            return {
                type: "error",
                errorMessage: "Start date and due date cannot be the same day.",
                retryable: false,
            }
        }

        const result = await asana.createProject({
            name: config.name,
            workspace: config.workspace_id,
            due_on: dueOn,
            start_on: startOn,
            default_access_level: config.default_access_level,
            minimum_access_level_for_customization: config.minimum_access_level_for_customization,
            minimum_access_level_for_sharing: config.minimum_access_level_for_sharing,
            owner: optionalNonEmptyString(config.owner_id),
            color: config.color,
            icon: config.icon,
        })

        if (isErrored(result)) {
            return {
                type: "error",
                errorMessage: asanaApiErrorUserMessage(result.error),
                retryable: result.error.code === "RATE_LIMITED",
            }
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
