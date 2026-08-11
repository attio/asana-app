import {asana} from "../asana/client"

export default async function getProject(projectGid: string) {
    return await asana.getProject(projectGid)
}
