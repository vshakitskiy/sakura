// @TODO: fill all tests
// @TODO: Remove `merge` concept, instead do rough joining

// import { bloom, fall } from "@vsh/sakura"
// import { baseSeed, get, is, isN } from "./utils.ts"

// const { branch, seed } = baseSeed()

// const base = branch()
//   .get("/", () => fall(200, "root"))
//   .get("/name", () => fall(200, "base"))
//   .get("/node", () => fall(200, "base"))
//   .get("/node/1", () => fall(200, "1"))
//   .get(
//     "/:echo",
//     ({ params }) => fall(200, params.echo || "invalid body"),
//   )

// // Do we even need merge???
// // base.join("/v1", j)

// const j = branch()
//   .get("/", () => fall(204))
//   .get("/node", () => fall(200, "base"))
//   .get("/node/2", () => fall(200, "2")) // /next
//   .get("/name", () => fall(200, "j"))
//   .get("/rand", () => fall(200, Math.random()))
//   .get("/time", () => fall(200, new Date()))
//   .get("/empty", () => fall(204))
//   .get("/params", ({ params }) => fall(200, params))

// Deno.test("Merge new tree node", async () => {
//   const port = 3004
//   const server = bloom({
//     seed,
//     branch: base.merge("/next", j),
//     quiet: true,
//     port,
//   })

//   const root = await get<string>(port, "/")
//   is(root.json, "root")
//   const echo = await get<string>(port, "/abc")
//   is(echo.json, "abc")
//   const baseName = await get<string>(port, "/name")
//   is(baseName.json, "base")

//   const e = await get<null>(port, "/next")
//   is(e.status, 204)
//   const jName = await get<string>(port, "/next/name")
//   is(jName.json, "j")
//   const nE = await get<null>(port, "/next/empty")
//   is(nE.status, 204)

//   server.shutdown()
// })

// Deno.test("Merge in existing node", async () => {
//   const port = 3005
//   const server = bloom({
//     seed,
//     branch: base.merge("/node", j),
//     quiet: true,
//     port,
//   })

//   const node = await get<null>(port, "/node")
//   is(node.status, 204)
//   const f = await get<string>(port, "/node/1")
//   is(f.json, "1")
//   const s = await get<string>(port, "/node/node/2")
//   is(s.json, "2")

//   server.shutdown()
// })

// Deno.test("Merge in root node", async () => {
//   const port = 3006
//   const server = bloom({
//     seed,
//     branch: base.merge("/", j),
//     quiet: true,
//     port,
//   })

//   const root = await get<string>(port, "/")
//   is(root.status, 204)
//   const echo = await get<string>(port, "/abc")
//   is(echo.json, "abc")

//   const node = await get<string>(port, "/node")
//   is(node.json, "base")
//   // const f = await get<string>(port, "/node/1")
//   // is(f.json, "1")
//   const s = await get<string>(port, "/node/2")
//   is(s.json, "2")

//   server.shutdown()
// })

// Deno.test("ge", () => {
//   base.join("/v1", j)
// })
