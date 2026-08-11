import {z} from "zod"

export type AsanaAPIError =
    | {code: "NOT_FOUND"}
    | {code: "RATE_LIMITED"}
    | {code: "UNAUTHORIZED"}
    | {code: "FORBIDDEN"}
    | {code: "INVALID_REQUEST"}
    | {code: "INVALID_USER_REFERENCE"}
    | {code: "PREMIUM_FEATURE_REQUIRED"}
    | {code: "ASANA_API_ERROR"}
    | {code: "UNEXPECTED_ERROR"}

const AsanaErrorBodySchema = z.object({
    errors: z
        .array(
            z.object({
                error: z.string().optional(),
                message: z.string().optional(),
            })
        )
        .optional(),
})

// e.g. "assignee: Not a valid actor ID: notvalid@no.com" or "owner: Not a valid actor ID: 123"
const NOT_A_VALID_ACTOR_ID_PATTERN = /not a valid actor id/i

function mapStatusToError(status: number): AsanaAPIError {
    switch (status) {
        case 400:
            return {code: "INVALID_REQUEST"}
        case 401:
            return {code: "UNAUTHORIZED"}
        case 403:
            return {code: "FORBIDDEN"}
        case 404:
            return {code: "NOT_FOUND"}
        case 429:
            return {code: "RATE_LIMITED"}
        default:
            return status >= 500 ? {code: "ASANA_API_ERROR"} : {code: "UNEXPECTED_ERROR"}
    }
}

/** Maps an Asana HTTP failure onto a semantic error, preferring known error keys in the body. */
export function mapAsanaApiError(status: number, bodyText: string | undefined): AsanaAPIError {
    if (bodyText === undefined || bodyText.length === 0) {
        return mapStatusToError(status)
    }

    let json: unknown
    try {
        json = JSON.parse(bodyText)
    } catch {
        return mapStatusToError(status)
    }

    const parsed = AsanaErrorBodySchema.safeParse(json)
    if (
        parsed.success &&
        parsed.data.errors?.some((error) => error.error === "premium_feature_access_failure")
    ) {
        return {code: "PREMIUM_FEATURE_REQUIRED"}
    }

    if (
        parsed.success &&
        parsed.data.errors?.some(
            (error) =>
                error.message !== undefined && NOT_A_VALID_ACTOR_ID_PATTERN.test(error.message)
        )
    ) {
        return {code: "INVALID_USER_REFERENCE"}
    }

    return mapStatusToError(status)
}

export function asanaApiErrorUserMessage(error: AsanaAPIError): string {
    switch (error.code) {
        case "UNAUTHORIZED":
            return "Asana authentication failed. Check your workspace connection."
        case "FORBIDDEN":
            return "Your Asana account doesn't have access to that resource."
        case "INVALID_REQUEST":
            return "The Asana request was invalid. Check the details and try again."
        case "INVALID_USER_REFERENCE":
            return "No user with that ID or email address was found in the Asana workspace."
        case "NOT_FOUND":
            return "The requested Asana resource was not found."
        case "RATE_LIMITED":
            return "Asana rate limit reached. Try again in a moment."
        case "PREMIUM_FEATURE_REQUIRED":
            return "Your Asana plan doesn't include this feature. Remove any premium-only settings (such as minimum access levels), or upgrade your Asana plan."
        case "ASANA_API_ERROR":
        case "UNEXPECTED_ERROR":
            return "An unexpected error occurred when calling Asana's API."
    }
}
