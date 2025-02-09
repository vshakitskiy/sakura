import protect from "./protect.ts"
import { fall } from "@vsh/sakura"

const session = protect
  .get("/", ({ seed: { user } }) => fall(200, user))
  .post("/out", ({ cookies }) => {
    cookies.deleteCookie("accessToken")
    return fall(204)
  })

export default session
