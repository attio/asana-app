import {asana} from "../asana/client"

export default async function listWorkspaces() {
    return await asana.listWorkspaces()
}
