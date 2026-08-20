/**
 * Which role an assignee was chosen for, carried inside the value the configurator stores.
 *
 * A config schema cannot key a value by role — its only containers are arrays and structs whose
 * keys are fixed when the block is built — and a configurator cannot write config, so the role gid
 * cannot be stored alongside the assignee. Encoding it into the member's own selection is what lets
 * a role be matched by gid rather than by the position of its picker.
 */
const SEPARATOR = ":"

export function encodeRoleAssignee({roleGid, userGid}: {roleGid: string; userGid: string}): string {
    return `${roleGid}${SEPARATOR}${userGid}`
}

/**
 * Returns undefined for anything `encodeRoleAssignee` did not write — a variable resolved at run
 * time, most likely, since a variable cannot carry the role it was wired to.
 */
export function decodeRoleAssignee(value: string): {roleGid: string; userGid: string} | undefined {
    const separatorIndex = value.indexOf(SEPARATOR)

    // Also rejects a leading or trailing separator, which would leave one side empty.
    if (separatorIndex <= 0 || separatorIndex === value.length - 1) {
        return undefined
    }

    return {
        roleGid: value.slice(0, separatorIndex),
        userGid: value.slice(separatorIndex + 1),
    }
}
