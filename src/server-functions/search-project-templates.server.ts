import {asana} from "../asana/client"

export default async function searchProjectTemplates(workspaceGids: string[], query: string) {
    return await asana.searchProjectTemplates({workspaceGids, query})
}
