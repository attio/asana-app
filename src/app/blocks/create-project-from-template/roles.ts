import {decodeRoleAssignee} from "../../../lib/role-assignee"

type TemplateRole = {gid: string; name: string}

/**
 * Pairs each role the template asks for with the user chosen for it.
 *
 * The configurator tags each assignee with the role it was picked for, so a role is matched by gid
 * wherever its value happens to sit. That makes the array's order irrelevant: a value left behind by
 * a different template names a role this template does not have and is ignored, and Asana returning
 * its roles in a different order than when the step was configured changes nothing.
 *
 * A variable cannot carry that tag, so an untagged value falls back to the position of the picker it
 * was entered in. Tagged values are excluded from that fallback — otherwise a stale one would stand
 * in for whichever role now occupies its position, which is the failure the tagging exists to stop.
 *
 * @see https://developers.asana.com/reference/instantiateproject
 */
export function buildRequestedRoles({
    roles,
    assignees,
}: {
    roles: TemplateRole[]
    assignees: Array<string | undefined>
}): Array<{gid: string; value: string}> {
    const decoded = assignees.map((assignee) =>
        assignee === undefined ? undefined : decodeRoleAssignee(assignee)
    )

    return roles.flatMap((role, index) => {
        const tagged = decoded.find((entry) => entry?.roleGid === role.gid)

        if (tagged !== undefined) {
            return [{gid: role.gid, value: tagged.userGid}]
        }

        const untagged = assignees[index]

        if (untagged === undefined || decoded[index] !== undefined) {
            return []
        }

        const trimmed = untagged.trim()

        return trimmed === "" ? [] : [{gid: role.gid, value: trimmed}]
    })
}
