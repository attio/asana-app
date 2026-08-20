import {describe, expect, it} from "vitest"
import {validateProjectDates} from "./rules"

describe(validateProjectDates, () => {
    it("accepts a due date without a start date", () => {
        expect(validateProjectDates({startOn: undefined, dueOn: "2026-09-30"})).toBeUndefined()
    })

    it("accepts a start date before the due date", () => {
        expect(validateProjectDates({startOn: "2026-09-01", dueOn: "2026-09-30"})).toBeUndefined()
    })

    it("requires a due date alongside a start date", () => {
        expect(validateProjectDates({startOn: "2026-09-01", dueOn: undefined})).toBe(
            "A due date is required when setting a start date."
        )
    })

    it.each([
        ["the same day", "2026-09-01", "2026-09-01"],
        ["a start date after the due date", "2026-09-10", "2026-09-01"],
    ])("rejects %s", (_case, startOn, dueOn) => {
        expect(validateProjectDates({startOn, dueOn})).toBe(
            "Start date must be before the due date."
        )
    })
})
