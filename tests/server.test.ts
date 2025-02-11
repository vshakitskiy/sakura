import { sakura } from "@vsh/sakura"
import { Cookies } from "@vsh/sakura/cookies"
import { exists, is } from "./utils.ts"

Deno.test("Initializing utilities", () => {
  const req = new Request("http://localhost:4040")

  const { seed, branch } = sakura((req) => ({
    req,
    foo: "bar",
  }))

  is(seed(req, new Cookies(req)), {
    req,
    foo: "bar",
  })

  const app = branch()
  exists(app)
})

// TODO: fill tests (< v1.0.0)
