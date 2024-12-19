import { bloom, fall, sakura } from "@vsh/sakura"
import { assertEquals, assertFalse } from "@std/assert"

const baseSeed = () => sakura((req) => ({ req }))

const ok = () => fall(200, { message: "ok" })
const empty = (status: number) => () => fall(status)

const req = async <T>(port: number, path: string) => {
  const req = await fetch(`http://localhost:${port}${path}`)
  try {
    return { json: await req.json() as T, status: req.status }
  } catch (_) {
    return { json: null, status: req.status }
  }
}

Deno.test("basic setup", async () => {
  const { branch, seed } = baseSeed()

  const server = bloom({
    seed,
    branch: branch().get("/", ok),
    log: true,
  })

  const { json, status } = await req<{ message: string }>(8000, "/")
  assertEquals(status, 200)
  assertEquals(json!.message, "ok")

  server.shutdown()
})

type Msg = { message: string }
Deno.test("bloom config", async () => {
  const { branch, seed } = baseSeed()
  const baseBranch = branch()
    .get("/unexpected", () => {
      throw new Error("Unexpected Error")
      // deno-lint-ignore no-unreachable
      return fall(200)
    })

  const first = bloom({
    seed,
    branch: baseBranch,
    port: 8123,
    unknown: () => fall(404, { message: "unknown" }),
    error: () => fall(500, { message: "error" }),
    log: true,
  })

  const unknownF = await req<Msg>(8123, "/abc")
  assertEquals(unknownF.status, 404)
  assertEquals(unknownF.json!.message, "unknown")

  const errorF = await req<Msg>(8123, "/unexpected")
  assertEquals(errorF.status, 500)
  assertEquals(errorF.json!.message, "error")

  first.shutdown()

  const second = bloom({
    seed,
    branch: baseBranch,
    port: 8124,
    log: true,
  })

  const unknownS = await req<null>(8124, "/abc")
  assertEquals(unknownS.status, 404)
  assertEquals(unknownS.json, null)

  const errorS = await req<null>(8124, "/unexpected")
  assertEquals(errorS.status, 500)
  assertEquals(errorS.json, null)

  second.shutdown()
})

Deno.test("matching petals", async () => {
  const { seed, branch } = baseSeed()
  const basic = branch()
    .get("/:f", empty(200))
    .post("/:f", empty(201))
    .get("/:f/test", empty(200))
    .post("/part/:f/part/:s", empty(201))

  assertFalse(!basic.match("GET", "/abc"))
  assertFalse(!basic.match("POST", "/def"))
  assertFalse(basic.match("PUT", "/ghi"))

  assertFalse(!basic.match("GET", "/abc/test"))
  assertFalse(basic.match("GET", "/abc/notest"))
  assertFalse(basic.match("POST", "/abc/test"))

  assertFalse(!basic.match("POST", "/part/abc/part/efg"))
  assertFalse(basic.match("POST", "/part/abc/part/efg/part"))

  const rewrite = branch()
    .get("/:before", empty(200))
    .get("/:after", empty(400))

  const match = rewrite.match("GET", "/abc")
  if (!match) throw new Error("expected match")
  const req = new Request("http:localhost:8000/abc")
  const res = await match.handler.petal(req, await seed(req))
  assertEquals(res.status, 400)
})
