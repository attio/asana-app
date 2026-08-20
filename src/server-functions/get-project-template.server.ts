import {asana} from "../asana/client"

export default async function getProjectTemplate(projectTemplateGid: string) {
    return await asana.getProjectTemplate(projectTemplateGid)
}
