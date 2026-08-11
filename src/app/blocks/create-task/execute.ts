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
        const result = await asana.createTask({
            name: config.name,
            workspace: config.workspace_id,
            privacy_setting: config.privacy_setting,
            due_on: config.due_on?.value ?? null,
            assignee: optionalNonEmptyString(config.assignee) ?? null,
            projects: config.projects.map((project) => project.gid),
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
                task_id: result.value.gid,
            },
        }
    })

export default execute
