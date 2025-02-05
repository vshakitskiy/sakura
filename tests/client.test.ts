import { fall, sakura } from "@vsh/sakura"
import { SakuraClient } from "@vsh/sakura/client"
import { exists, is } from "./utils.ts"

const { branch, seed } = sakura((req, cookies) => ({
  req,
  cookies,
}))
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

const client = new SakuraClient(app, seed, {
  error: ({ error }) => fall(500, (error as Error).message),
})

Deno.test("Echo body", async () => {
  const body = { foo: "bar", k: 0 }
  const res = await client.post<typeof body>("/echo", {
    body,
  })
  exists(res)

  is(res!.body, body)
})

Deno.test("Echo params and query", async () => {
  const res = await client.get("/echo/123?foo=bar&k=0,1,2")
  exists(res)

  is(res!.body, {
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
  exists(res)

  is(res!.body, cookies)
  is(res!.res.headers.getSetCookie(), ["runtime=deno"])
  is(res!.cookies.getSet(), [{
    name: "runtime",
    value: "deno",
  }])
  is(res!.cookies.get(), { v: "0" })
})

Deno.test("Handle on error", async () => {
  const res = await client.get("/error")
  exists(res)

  is(res!.body, "some error")
})
