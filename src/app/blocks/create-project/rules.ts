/**
 * @see https://developers.asana.com/reference/createproject
 */
export function validateProjectDates({
    startOn,
    dueOn,
}: {
    startOn: string | undefined
    dueOn: string | undefined
}): string | undefined {
    if (startOn === undefined) {
        return undefined
    }

    if (dueOn === undefined) {
        return "A due date is required when setting a start date."
    }

    if (startOn >= dueOn) {
        return "Start date must be before the due date."
    }

    return undefined
}
