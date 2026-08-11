import {asana} from "../asana/client"

export default async function getUser(userGid: string) {
    return await asana.getUser(userGid)
}
