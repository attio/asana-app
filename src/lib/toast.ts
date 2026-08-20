import {showToast} from "attio/client"

/**
 * Surfaces a failed Asana read in a toast, for the places where the UI has nowhere to render the
 * error inline — an options provider that can only return rows, or a configurator input whose
 * `help` text belongs to the field rather than to a transient failure.
 */
export function showAsanaErrorToast({subject, message}: {subject: string; message: string}) {
    showToast({
        title: `Could not load Asana ${subject}`,
        text: message,
        variant: "error",
        durationMs: 10_000,
    })
}
