import { assertEquals, assertExists } from "@std/assert"
import { z } from "zod"
import { fall, sakura } from "../package/mod.ts"
import { SakuraClient } from "../package/client.ts"

const { branch, seed } = sakura((req) => ({ req }))

Deno.test("Routing: Basic GET", async () => {
  const app = branch().get("/ping", () => fall(200, { message: "pong" }))
  const client = new SakuraClient(app, seed)
  const { res, body } = await client.get("/ping")

  assertEquals(res.status, 200)
  assertEquals(body, { message: "pong" })
  assertEquals(res.headers.get("content-type"), "application/json")
})

Deno.test("Routing: Basic POST", async () => {
  const app = branch().post("/echo", ({ body: reqBody }) =>
    fall(201, { received: reqBody }),
  )
  const client = new SakuraClient(app, seed)
  const testPayload = { foo: "bar", baz: 123 }
  const { res, body } = await client.post("/echo", { body: testPayload })

  assertEquals(res.status, 201)
  assertEquals(body, { received: testPayload })
})

Deno.test("Routing: PUT and PATCH", async () => {
  const app = branch()
    .put("/resource", () => fall(200, { method: "PUT" }))
    .patch("/resource", () => fall(200, { method: "PATCH" }))

  const client = new SakuraClient(app, seed)

  const putRes = await client.put("/resource", { body: { id: 1 } })
  assertEquals(putRes.res.status, 200)
  assertEquals(putRes.body, { method: "PUT" })

  const patchRes = await client.patch("/resource", { body: { name: "test" } })
  assertEquals(patchRes.res.status, 200)
  assertEquals(patchRes.body, { method: "PATCH" })
})

Deno.test("Routing: DELETE", async () => {
  const app = branch().delete("/item/1", () => fall(204))
  const client = new SakuraClient(app, seed)
  const { res, body } = await client.delete("/item/1")

  assertEquals(res.status, 204)
  assertEquals(body, null)
})

Deno.test("Routing: Path Parameters", async () => {
  const app = branch().get("/users/:userId/posts/:postId", ({ params }) =>
    fall(200, { params }),
  )
  const client = new SakuraClient(app, seed)
  const { res, body } = await client.get("/users/123/posts/abc")

  assertEquals(res.status, 200)
  assertEquals(body, { params: { userId: "123", postId: "abc" } })
})

Deno.test("Routing: Query Parameters", async () => {
  const app = branch().get("/search", ({ query }) => fall(200, { query }))
  const client = new SakuraClient(app, seed)
  const { res, body } = await client.get("/search?q=sakura&limit=10")

  assertEquals(res.status, 200)
  assertEquals(body, { query: { q: "sakura", limit: "10" } })
})

Deno.test("Routing: Route Not Found (Default)", async () => {
  const app = branch().get("/exists", () => fall(200))
  const client = new SakuraClient(app, seed)
  const { res, body } = await client.get("/does-not-exist")

  assertEquals(res.status, 404)
  assertEquals(body, { message: "not found" })
})

Deno.test("Routing: Route Not Found (Custom Handler)", async () => {
  const app = branch().get("/exists", () => fall(200))
  const client = new SakuraClient(app, seed, {
    unknown: ({ req }) =>
      fall(404, { error: `Path ${new URL(req.url).pathname} not found` }),
  })
  const { res, body } = await client.get("/does-not-exist")

  assertEquals(res.status, 404)
  assertEquals(body, { error: "Path /does-not-exist not found" })
})

Deno.test("Routing: Merging Branches", async () => {
  const users = branch().get("/:id", ({ params }) =>
    fall(200, { user: params.id }),
  )
  const posts = branch().get("/:id", ({ params }) =>
    fall(200, { post: params.id }),
  )

  const app = branch()
    .get("/", () => fall(200, { root: true }))
    .merge("/users", users)
    .merge("/posts", posts)

  const client = new SakuraClient(app, seed)

  const rootRes = await client.get("/")
  assertEquals(rootRes.body, { root: true })

  const userRes = await client.get("/users/u1")
  assertEquals(userRes.body, { user: "u1" })

  const postRes = await client.get("/posts/p1")
  assertEquals(postRes.body, { post: "p1" })
})

Deno.test("Routing: Parameter Validation (Zod)", async () => {
  const ParamsSchema = z.object({
    id: z.coerce.number().int().positive(),
  })

  const app = branch().get(
    "/items/:id",
    ({ params }) => fall(200, { itemId: params.id, type: typeof params.id }),
    { params: ParamsSchema },
  )
  const client = new SakuraClient(app, seed, {
    // Add error handler to check validation failure
    error: ({ error }) => {
      if (error instanceof z.ZodError) {
        return fall(400, { validationErrors: error.issues })
      }
      return fall(500, { message: "Unknown error" })
    },
  })

  const validRes = await client.get("/items/42")
  assertEquals(validRes.res.status, 200)
  assertEquals(validRes.body, { itemId: 42, type: "number" })

  const invalidStrRes = await client.get("/items/abc")
  assertEquals(invalidStrRes.res.status, 400)
  assertExists(invalidStrRes.body?.validationErrors)
  assertEquals(invalidStrRes.body?.validationErrors[0].code, "invalid_type")

  // Invalid (not positive)
  const invalidNumRes = await client.get("/items/0")
  assertEquals(invalidNumRes.res.status, 400)
  assertExists(invalidNumRes.body?.validationErrors)
  assertEquals(invalidNumRes.body?.validationErrors[0].code, "too_small")
})

Deno.test("Routing: Query Validation (Zod)", async () => {
  const QuerySchema = z.object({
    search: z.string().min(3),
    limit: z.coerce.number().optional().default(10),
  })

  const app = branch().get(
    "/products",
    ({ query }) => fall(200, { data: query }),
    { query: QuerySchema },
  )
  const client = new SakuraClient(app, seed, {
    error: ({ error }) => {
      if (error instanceof z.ZodError) {
        return fall(400, { validationErrors: error.issues })
      }
      return fall(500, { message: "Unknown error" })
    },
  })

  const validRes = await client.get("/products?search=apple&limit=5")
  assertEquals(validRes.res.status, 200)
  assertEquals(validRes.body, { data: { search: "apple", limit: 5 } })

  const defaultLimitRes = await client.get("/products?search=banana")
  assertEquals(defaultLimitRes.res.status, 200)
  assertEquals(defaultLimitRes.body, { data: { search: "banana", limit: 10 } })

  const shortSearchRes = await client.get("/products?search=ap")
  assertEquals(shortSearchRes.res.status, 400)
  assertExists(shortSearchRes.body?.validationErrors)
  assertEquals(shortSearchRes.body?.validationErrors[0].code, "too_small")

  const missingSearchRes = await client.get("/products?limit=20")
  assertEquals(missingSearchRes.res.status, 400)
  assertExists(missingSearchRes.body?.validationErrors)
  assertEquals(missingSearchRes.body?.validationErrors[0].code, "invalid_type")
})

Deno.test("Routing: Body Validation (Zod)", async () => {
  const BodySchema = z.object({
    name: z.string().min(1),
    value: z.number(),
  })

  const app = branch().post(
    "/data",
    ({ body: reqBody }) => fall(201, { created: reqBody }),
    { body: BodySchema },
  )
  const client = new SakuraClient(app, seed, {
    error: ({ error }) => {
      if (error instanceof z.ZodError) {
        return fall(400, { validationErrors: error.issues })
      }
      if (error instanceof SyntaxError && error.message.includes("JSON")) {
        return fall(400, { message: "Invalid JSON format" })
      }
      return fall(500, { message: "Unknown error" })
    },
  })

  const validPayload = { name: "test", value: 123 }
  const validRes = await client.post("/data", { body: validPayload })
  assertEquals(validRes.res.status, 201)
  assertEquals(validRes.body, { created: validPayload })

  const missingNamePayload = { value: 456 }
  const missingNameRes = await client.post("/data", {
    body: missingNamePayload,
  })
  assertEquals(missingNameRes.res.status, 400)
  assertExists(missingNameRes.body?.validationErrors)
  assertEquals(missingNameRes.body?.validationErrors[0].code, "invalid_type")

  const wrongTypePayload = { name: "another", value: "not a number" }
  const wrongTypeRes = await client.post("/data", { body: wrongTypePayload })
  assertEquals(wrongTypeRes.res.status, 400)
  assertExists(wrongTypeRes.body?.validationErrors)
  assertEquals(wrongTypeRes.body?.validationErrors[0].code, "invalid_type")
})
