import {asana} from "../asana/client"

export default async function listUsers(workspace: string) {
    return await asana.listUsers({workspace})
}
