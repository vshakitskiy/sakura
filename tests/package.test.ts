import { bloom, res, sakura } from "@vsh/sakura"
import { assertEquals } from "@std/assert"

Deno.test("basic setup", async () => {
  const { branch, seed } = sakura((req) => ({
    req,
  }))

  const b = branch()
    .get("/", (_req, _seed) => res(200, { message: "ok" }))

  // start server
  const server = bloom({
    seed,
    branch: b,
    unknownPetal: (_req, _seed) => res(404, { message: "unknown handler" }),
  })

  const onRoot = await fetch("http://localhost:8000/")
  assertEquals(onRoot.status, 200)
  assertEquals((await onRoot.json()).message, "ok")

  const onUnknown = await fetch("http://localhost:8000/abc")
  assertEquals(onUnknown.status, 404)
  assertEquals((await onUnknown.json()).message, "unknown handler")

  server.shutdown()
})

// TODO: proper dynamic tests
Deno.test("dynamic petals", () => {
  const { branch } = sakura((req) => ({ req }))
  const b = branch()
    .get("/:id", () => res(200))
    .post("/:id", () => res(201))
    .get("/:id/test", () => res(200))
    .post("/users/:userId/posts/:postId", () => res(201))

  console.log(b.match("GET", "/1"))
  console.log(b.match("PUT", "/1"))
  console.log(b.match("GET", "/1/abc"))
  console.log(b.match("GET", "/1/test"))
  console.log(b.match("POST", "/users/1/posts/2"))
})
