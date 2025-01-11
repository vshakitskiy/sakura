import protect from "./protect.ts"
import { fall } from "@vsh/sakura"

const session = protect.get("/", ({ seed: { user } }) => fall(200, user))

export default session
