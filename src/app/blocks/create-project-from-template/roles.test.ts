import {describe, expect, it} from "vitest"
import {encodeRoleAssignee} from "../../../lib/role-assignee"
import {buildRequestedRoles} from "./roles"

const ROLES = [
    {gid: "r1", name: "Tech Lead"},
    {gid: "r2", name: "Designer"},
]

const tag = (roleGid: string, userGid: string) => encodeRoleAssignee({roleGid, userGid})

describe(buildRequestedRoles, () => {
    it("pairs each role with the user tagged for it", () => {
        expect(
            buildRequestedRoles({roles: ROLES, assignees: [tag("r1", "u1"), tag("r2", "u2")]})
        ).toEqual([
            {gid: "r1", value: "u1"},
            {gid: "r2", value: "u2"},
        ])
    })

    it("matches by role rather than by position, so Asana reordering its roles is harmless", () => {
        expect(
            buildRequestedRoles({roles: ROLES, assignees: [tag("r2", "u2"), tag("r1", "u1")]})
        ).toEqual([
            {gid: "r1", value: "u1"},
            {gid: "r2", value: "u2"},
        ])
    })

    it("ignores an assignee left behind by a different template", () => {
        expect(
            buildRequestedRoles({roles: ROLES, assignees: [tag("old1", "u1"), tag("old2", "u2")]})
        ).toEqual([])
    })

    it("does not let a stale assignee stand in positionally for the role now in its slot", () => {
        expect(
            buildRequestedRoles({roles: ROLES, assignees: [tag("old1", "u1"), tag("r2", "u2")]})
        ).toEqual([{gid: "r2", value: "u2"}])
    })

    it("falls back to position for an untagged value, which is what a variable resolves to", () => {
        expect(
            buildRequestedRoles({roles: ROLES, assignees: [undefined, "someone@example.com"]})
        ).toEqual([{gid: "r2", value: "someone@example.com"}])
    })

    it.each([
        ["unset", undefined],
        ["blank", ""],
        ["whitespace", "   "],
    ])("omits a role left %s so its tasks stay unassigned", (_case, assignee) => {
        expect(buildRequestedRoles({roles: ROLES, assignees: [assignee, tag("r2", "u2")]})).toEqual(
            [{gid: "r2", value: "u2"}]
        )
    })

    it("sends nothing when the template has no roles", () => {
        expect(buildRequestedRoles({roles: [], assignees: [tag("old1", "u1")]})).toEqual([])
    })
})
