export const DEFAULT_ACCESS_LEVELS = ["admin", "editor", "commenter", "viewer"] as const
export type AsanaDefaultAccessLevel = (typeof DEFAULT_ACCESS_LEVELS)[number]

export const MINIMUM_ACCESS_LEVELS = ["admin", "editor"] as const
export type AsanaMinimumAccessLevel = (typeof MINIMUM_ACCESS_LEVELS)[number]

/** @see https://developers.asana.com/reference/createproject */

export const PROJECT_COLORS = [
    "dark-pink",
    "dark-green",
    "dark-blue",
    "dark-red",
    "dark-teal",
    "dark-brown",
    "dark-orange",
    "dark-purple",
    "dark-warm-gray",
    "light-pink",
    "light-green",
    "light-blue",
    "light-red",
    "light-teal",
    "light-brown",
    "light-orange",
    "light-purple",
    "light-warm-gray",
] as const
export type AsanaProjectColor = (typeof PROJECT_COLORS)[number]

export const PROJECT_ICONS = [
    "list",
    "board",
    "timeline",
    "calendar",
    "rocket",
    "people",
    "graph",
    "star",
    "bug",
    "light_bulb",
    "globe",
    "gear",
    "notebook",
    "computer",
    "check",
    "target",
    "html",
    "megaphone",
    "chat_bubbles",
    "briefcase",
    "page_layout",
    "mountain_flag",
    "puzzle",
    "presentation",
    "line_and_symbols",
    "speed_dial",
    "ribbon",
    "shoe",
    "shopping_basket",
    "map",
    "ticket",
    "coins",
] as const
export type AsanaProjectIcon = (typeof PROJECT_ICONS)[number]
