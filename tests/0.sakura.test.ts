import { bloom, Branch, fall, sakura } from "@vsh/sakura"
import { is } from "./utils.ts"

const req = new Request("http://localhost:3000/")

Deno.test("Generate utilities", async () => {
  const { branch: b, seed: s } = sakura((req) => ({ req, foo: "bar" }))

  const seed = await s(req)
  is(seed.foo, "bar")
  is(b() instanceof Branch, true)
})

Deno.test("Simple start", () => {
  const { branch: b, seed } = sakura((req) => ({ req, bar: "foo" }))

  const server = bloom({
    seed,
    branch: b().get("/ping", () => fall(200, "pong")),
    quiet: true,
  })

  server.shutdown()
})
