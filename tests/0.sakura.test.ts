import { bloom, Branch, sakura } from "@vsh/sakura"
import { baseSeed, get, is, type Msg, ok } from "./utils.ts"

const req = new Request("http://localhost:3000/")

Deno.test("Generate utilities", async () => {
  const { branch: b, seed: s } = sakura((req) => ({ req, foo: "bar" }))

  const seed = await s(req)
  is(seed.foo, "bar")
  is(b() instanceof Branch, true)
})
