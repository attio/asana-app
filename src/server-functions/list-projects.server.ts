import {asana} from "../asana/client"

export default async function listProjects(workspace: string) {
    return await asana.listProjects({workspace})
}
