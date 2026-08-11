/** @see https://developers.asana.com/reference/createtask */
export const PRIVACY_SETTINGS = ["public_with_guests", "public", "private"] as const
export type AsanaTaskPrivacySetting = (typeof PRIVACY_SETTINGS)[number]
