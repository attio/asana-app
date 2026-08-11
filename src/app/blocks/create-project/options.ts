import {
    DEFAULT_ACCESS_LEVELS,
    MINIMUM_ACCESS_LEVELS,
    PROJECT_COLORS,
    PROJECT_ICONS,
} from "../../../asana/project-fields"

/** Turns Asana enum values like "dark-pink" / "light_bulb" into dropdown labels like "Dark Pink". */
function formatEnumLabel(value: string): string {
    return value
        .split(/[-_]/)
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(" ")
}

export const PROJECT_COLOR_OPTIONS = PROJECT_COLORS.map((value) => ({
    value,
    label: formatEnumLabel(value),
}))

export const PROJECT_ICON_OPTIONS = PROJECT_ICONS.map((value) => ({
    value,
    label: formatEnumLabel(value),
}))

export const DEFAULT_ACCESS_LEVEL_OPTIONS = DEFAULT_ACCESS_LEVELS.map((value) => ({
    value,
    label: formatEnumLabel(value),
}))

export const MINIMUM_ACCESS_LEVEL_OPTIONS = MINIMUM_ACCESS_LEVELS.map((value) => ({
    value,
    label: formatEnumLabel(value),
}))
