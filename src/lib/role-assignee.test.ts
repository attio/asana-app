import {describe, expect, it} from "vitest"
import {decodeRoleAssignee, encodeRoleAssignee} from "./role-assignee"

describe(decodeRoleAssignee, () => {
    it("recovers what encodeRoleAssignee wrote", () => {
        expect(decodeRoleAssignee(encodeRoleAssignee({roleGid: "r1", userGid: "u1"}))).toEqual({
            roleGid: "r1",
            userGid: "u1",
        })
    })

    it.each([
        ["a bare user gid", "12345"],
        ["an email address from a variable", "someone@example.com"],
        ["the literal me", "me"],
        ["a leading separator", ":u1"],
        ["a trailing separator", "r1:"],
        ["nothing", ""],
    ])("treats %s as untagged", (_case, value) => {
        expect(decodeRoleAssignee(value)).toBeUndefined()
    })
})
