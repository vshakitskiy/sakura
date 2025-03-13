import { fall, sakura } from "@vsh/sakura"
import { SakuraClient } from "@vsh/sakura/client"
import { is } from "./utils.ts"
import { z, ZodError } from "zod"

const { branch, seed } = sakura((req, cookies) => ({
  req,
  cookies,
}))

const body = z.object({
  foo: z.string(),
  bar: z.string(),
})

const app = branch()
  .post("/echo", ({ body }) => fall(200, body))
  .get("/echo/:echo", ({ params, query }) => fall(200, { params, query }))
  .get("/echo/cookies", ({ cookies }) => {
    cookies.set({
      name: "runtime",
      value: "deno",
    })
    return fall(200, cookies.get())
  })
  .get("/error", () => {
    throw new Error("some error")

    // deno-lint-ignore no-unreachable
    return fall(200)
  })
  .post(
    "/zod",
    ({ body }) => {
      return fall(200, body)
    },
    { body },
  )

const client = new SakuraClient(app, seed, {
  error: ({ error }) => {
    if (error instanceof ZodError) {
      return fall(500, error.issues)
    }
    return fall(500, (error as Error).message)
  },
})

Deno.test("Echo body", async () => {
  const body = { foo: "bar", k: 0 }
  const res = await client.post<typeof body>("/echo", {
    body,
  })

  is(res.body, body)
})

Deno.test("Echo params and query", async () => {
  const res = await client.get("/echo/123?foo=bar&k=0,1,2")

  is(res.body, {
    params: {
      echo: "123",
    },
    query: {
      foo: "bar",
      k: "0,1,2",
    },
  })
})

Deno.test("Ensure cookies", async () => {
  const cookies = {
    v: "0",
  }

  const res = await client.get<typeof cookies>("/echo/cookies", {
    cookies,
  })

  is(res.body, cookies)
  is(res.res.headers.getSetCookie(), ["runtime=deno"])
  is(res.cookies.getSet(), [
    {
      name: "runtime",
      value: "deno",
    },
  ])
  is(res.cookies.get(), { v: "0" })
})

Deno.test("Handle on error", async () => {
  const res = await client.get("/error")

  is(res.body, "some error")
})

Deno.test("On unknown", async () => {
  const res = await client.get("/unknown")

  is(res.body, { message: "not found" })
})

Deno.test("Zod parsing", async () => {
  const res = await client.post<z.infer<typeof body>>("/zod", {
    body: {
      foo: "0",
      bar: "1",
    },
  })

  is(res.body, {
    foo: "0",
    bar: "1",
  })

  const invalid = await client.post("/zod", {
    body: [],
  })

  is(invalid.body, [
    {
      code: "invalid_type",
      expected: "object",
      received: "array",
      path: [],
      message: "Expected object, received array",
    },
  ])
})
