import {asana} from "../asana/client"

export default async function getWorkspace(workspaceGid: string) {
    return await asana.getWorkspace(workspaceGid)
}
