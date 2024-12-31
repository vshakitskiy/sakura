// @TODO: fill all tests

import { bloom, fall } from "@vsh/sakura"
import { baseSeed, get, is } from "./utils.ts"

const { branch, seed } = baseSeed()

const base = branch()
  .get("/", () => fall(200, "root"))
  .get("/name", () => fall(200, "base"))
  .get(
    "/:echo",
    ({ params }) => fall(200, params.echo || "invalid body"),
  )

const j = branch()
  .get("/", () => fall(204))
  .get("/name", () => fall(200, "j"))
  .get("/rand", () => fall(200, Math.random()))
  .get("/time", () => fall(200, new Date()))
  .get("/empty", () => fall(204))
  .get("/params", ({ params }) => fall(200, params))

Deno.test("Merge new tree node", async () => {
  const port = 3004
  const server = bloom({
    seed,
    branch: base.merge("/next", j),
    quiet: true,
    port,
  })

  const root = await get<string>(port, "/")
  is(root.json, "root")
  const echo = await get<string>(port, "/abc")
  is(echo.json, "abc")
  const baseName = await get<string>(port, "/name")
  is(baseName.json, "base")

  const e = await get<null>(port, "/next")
  is(e.status, 204)
  const jName = await get<string>(port, "/next/name")
  is(jName.json, "j")
  const nE = await get<null>(port, "/next/empty")
  is(nE.status, 204)

  server.shutdown()
})

// Deno.test("Merge new tree node with dynamic path", async () => {
//   const port = 3004
//   const server = bloom({
//     seed,
//     branch: base.merge("/:dyn", j),
//     quiet: true,
//     port,
//   })

//   const root = await get<string>(port, "/")
//   is(root.json, "root")
//   const baseName = await get<string>(port, "/name")
//   is(baseName.json, "base")

//   server.shutdown()
// })

// Deno.bench("base", () => {
//   const f = branch()
//     .get("/", plug)
//     .post("/", plug)
//     .get("/:id", plug)
//     .get("/a", plug)
//     .get("/b/:id", plug)
//     .get("/b/:id/c", plug)

//   const s = branch()
//     .get("/", plug)
//     .post("/:id", plug)
//     .get("/d", plug)
//     .get("/d/:id", plug)
//     .get("/d/:id/f", plug)

//   f.merge("/v1", s).merge("/api/v1", s).merge("/v2", s).merge("/api/v2", s)
//     .match("GET", "/api/v1")
// })
