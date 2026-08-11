import {PRIVACY_SETTINGS, type AsanaTaskPrivacySetting} from "../../../asana/task-fields"

const PRIVACY_SETTING_LABELS: Record<AsanaTaskPrivacySetting, string> = {
    public_with_guests: "Public with guests",
    public: "Public",
    private: "Private",
}

export const PRIVACY_SETTING_OPTIONS = PRIVACY_SETTINGS.map((value) => ({
    value,
    label: PRIVACY_SETTING_LABELS[value],
}))
