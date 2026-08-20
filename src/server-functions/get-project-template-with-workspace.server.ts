import {asana} from "../asana/client"

export default async function getProjectTemplateWithWorkspace(projectTemplateGid: string) {
    return await asana.getProjectTemplateWithWorkspace(projectTemplateGid)
}
