import {complete, errored, isErrored, type Result} from "@attio/fetchable"
import {beforeEach, describe, expect, type MockedFunction, it, vi} from "vitest"
import {asana} from "./client"
import type {wrapAsana} from "./wrap"

function expectComplete<TValue>(result: Result<TValue, unknown>): TValue {
    if (isErrored(result)) {
        throw new Error(`expected a complete result, got ${JSON.stringify(result.error)}`)
    }
    return result.value
}

const {wrapAsanaMock} = vi.hoisted(() => ({
    wrapAsanaMock: vi.fn() as MockedFunction<typeof wrapAsana>,
}))

vi.mock("./wrap", () => ({wrapAsana: wrapAsanaMock}))

beforeEach(() => {
    wrapAsanaMock.mockReset()
})

function lastRequestPath(): string {
    const calls = wrapAsanaMock.mock.calls
    return String(calls[calls.length - 1]?.[0])
}

function lastRequestBody(): unknown {
    const calls = wrapAsanaMock.mock.calls
    const init = calls[calls.length - 1]?.[1]
    return JSON.parse(String(init?.body))
}

describe(asana.searchProjectTemplates, () => {
    it("passes the query through to the typeahead endpoint", async () => {
        wrapAsanaMock.mockResolvedValueOnce(complete({data: [{gid: "t1", name: "T1"}]}))

        await asana.searchProjectTemplates({workspaceGids: ["123"], query: "launch"})

        expect(lastRequestPath()).toContain("/workspaces/123/typeahead")
        expect(lastRequestPath()).toContain("resource_type=project_template")
        expect(lastRequestPath()).toContain("query=launch")
    })

    it("omits the query when it is blank, which lists templates instead of searching", async () => {
        wrapAsanaMock.mockResolvedValueOnce(complete({data: []}))

        await asana.searchProjectTemplates({workspaceGids: ["123"], query: ""})

        expect(lastRequestPath()).not.toContain("query=")
    })

    it("tags each hit with the workspace it came from", async () => {
        wrapAsanaMock
            .mockResolvedValueOnce(complete({data: [{gid: "t1", name: "T1"}]}))
            .mockResolvedValueOnce(complete({data: [{gid: "t2", name: "T2"}]}))

        const result = await asana.searchProjectTemplates({
            workspaceGids: ["123", "456"],
            query: "launch",
        })

        expect(expectComplete(result)).toEqual([
            {gid: "t1", name: "T1", workspaceGid: "123"},
            {gid: "t2", name: "T2", workspaceGid: "456"},
        ])
    })

    it("surfaces the error when a workspace search fails", async () => {
        wrapAsanaMock
            .mockResolvedValueOnce(complete({data: [{gid: "t1", name: "T1"}]}))
            .mockResolvedValueOnce(errored({code: "RATE_LIMITED"}))

        const result = await asana.searchProjectTemplates({
            workspaceGids: ["123", "456"],
            query: "launch",
        })

        expect(isErrored(result) && result.error).toEqual({code: "RATE_LIMITED"})
    })
})

describe(asana.instantiateProject, () => {
    it("sends the requested dates when the template asks for them", async () => {
        wrapAsanaMock.mockResolvedValueOnce(complete({data: {new_project: {gid: "p1"}}}))

        await asana.instantiateProject({
            projectTemplateGid: "tmpl1",
            name: "New project",
            requestedDates: [{gid: "1", value: "2026-09-01"}],
            requestedRoles: [],
        })

        expect(lastRequestBody()).toEqual({
            data: {name: "New project", requested_dates: [{gid: "1", value: "2026-09-01"}]},
        })
    })

    it("omits requested_dates entirely when the template asks for no dates", async () => {
        wrapAsanaMock.mockResolvedValueOnce(complete({data: {new_project: {gid: "p1"}}}))

        await asana.instantiateProject({
            projectTemplateGid: "tmpl1",
            name: "New project",
            requestedDates: [],
            requestedRoles: [],
        })

        expect(lastRequestBody()).toEqual({data: {name: "New project"}})
    })

    it("sends the requested roles when the template asks for them", async () => {
        wrapAsanaMock.mockResolvedValueOnce(complete({data: {new_project: {gid: "p1"}}}))

        await asana.instantiateProject({
            projectTemplateGid: "tmpl1",
            name: "New project",
            requestedDates: [],
            requestedRoles: [{gid: "r1", value: "u1"}],
        })

        expect(lastRequestBody()).toEqual({
            data: {name: "New project", requested_roles: [{gid: "r1", value: "u1"}]},
        })
    })
})
