import {type AsyncResult, complete, errored} from "@attio/fetchable"
import {getUserConnection} from "attio/server"
import {type AsanaAPIError, mapAsanaApiError} from "./error"

const ASANA_API_BASE_URL = "https://app.asana.com/api/1.0"

export async function wrapAsana(
    path: string,
    init: RequestInit = {}
): AsyncResult<unknown, AsanaAPIError> {
    const connection = getUserConnection()

    try {
        const response = await fetch(`${ASANA_API_BASE_URL}${path}`, {
            ...init,
            headers: {
                authorization: `Bearer ${connection.value}`,
                accept: "application/json",
                "content-type": "application/json",
                ...init.headers,
            },
        })

        if (!response.ok) {
            let body: string | undefined
            try {
                body = await response.text()
            } catch (readError) {
                console.error("[asana] failed to read error response body", readError)
            }
            const error = mapAsanaApiError(response.status, body)
            console.error("[asana] API request failed", {
                path,
                method: init.method ?? "GET",
                status: response.status,
                code: error.code,
                body,
            })
            return errored(error)
        }

        try {
            return complete(await response.json())
        } catch (error) {
            console.error("[asana] failed to parse response body", error)
            return errored({code: "UNEXPECTED_ERROR"})
        }
    } catch (error) {
        console.error("[asana] network error calling Asana API", error)
        return errored({code: "UNEXPECTED_ERROR"})
    }
}
