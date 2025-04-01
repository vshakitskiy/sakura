import { assertEquals } from "@std/assert"
import { fall, pluck, sakura } from "../package/mod.ts"
import { SakuraClient } from "../package/client.ts"

const { branch, seed } = sakura(() => ({ authenticated: false }))

Deno.test("Response: fall() creates correct JSON response", async () => {
  const app = branch().get("/data", () =>
    fall(201, { id: 1, value: "test" }, { "X-Custom-Header": "Sakura" }),
  )
  const client = new SakuraClient(app, seed)
  const { res, body } = await client.get("/data")

  assertEquals(res.status, 201)
  assertEquals(res.headers.get("content-type"), "application/json")
  assertEquals(res.headers.get("X-Custom-Header"), "Sakura")
  assertEquals(body, { id: 1, value: "test" })
})

Deno.test("Response: fall() with no body", async () => {
  const app = branch().post("/empty", () => fall(204))
  const client = new SakuraClient(app, seed)
  const { res, body } = await client.post("/empty", { body: {} })

  assertEquals(res.status, 204)
  assertEquals(res.headers.get("content-type"), "application/json")
  assertEquals(body, null)
})

Deno.test("Response: pluck() triggers early response", async () => {
  const app = branch()
    .with((_seed) => {
      throw pluck(
        401,
        { error: "Invalid token" },
        { "WWW-Authenticate": 'Bearer realm="api"' },
      )

      return { ..._seed, authenticated: true }
    })
    .get("/secure", ({ seed: s }) => {
      return fall(200, { message: "Welcome", auth: s.authenticated })
    })

  const client = new SakuraClient(app, seed)
  const { res, body } = await client.get("/secure")

  assertEquals(res.status, 401)
  assertEquals(body, { error: "Invalid token" })
  assertEquals(res.headers.get("content-type"), "application/json")
  assertEquals(res.headers.get("www-authenticate"), 'Bearer realm="api"')
})

Deno.test("Response: pluck() within handler", async () => {
  const app = branch().get("/check/:value", ({ params }) => {
    if (params.value === "forbidden") {
      throw pluck(403, { reason: "Access denied" })
    }
    return fall(200, { status: "Allowed" })
  })

  const client = new SakuraClient(app, seed)

  const resAllowed = await client.get("/check/allowed")
  assertEquals(resAllowed.res.status, 200)
  assertEquals(resAllowed.body, { status: "Allowed" })

  const resForbidden = await client.get("/check/forbidden")
  assertEquals(resForbidden.res.status, 403)
  assertEquals(resForbidden.body, { reason: "Access denied" })
})
