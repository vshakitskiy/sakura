import { bloom, fall } from "@vsh/sakura"
import { baseSeed, empty, get, is, type Msg } from "./utils.ts"

const { branch: b, seed } = baseSeed()
const branch = b()
  .get("/unexpected", () => {
    throw new Error("Unexpected Error")
    // deno-lint-ignore no-unreachable
    return fall(200)
  })

Deno.test("Catch unknown endpoint", async () => {
  const port = 3000
  const server = bloom({
    seed,
    branch,
    quiet: true,
    port,
  })

  const unknown = await get<Msg>(port, "/abc")
  is(unknown.status, 404)
  is(unknown.json!.message, "not found")

  server.shutdown()
})

Deno.test("Catch unexpected error", async () => {
  const port = 3001
  const server = bloom({
    seed,
    branch,
    quiet: true,
    port,
  })

  const error = await get<Msg>(port, "/unexpected")
  is(error.status, 500)
  is(error.json!.message, "internal server error")

  server.shutdown()
})

Deno.test("Handle custom petals", async () => {
  const port = 3002
  const server = bloom({
    seed,
    branch,
    quiet: true,
    port,
    unknown: () => fall(405, "foo"),
    error: () => fall(501, "bar"),
  })

  const unknown = await get<string>(port, "/abc")
  is(unknown.status, 405)
  is(unknown.json!, "foo")

  const error = await get<string>(port, "/unexpected")
  is(error.status, 501)
  is(error.json!, "bar")

  server.shutdown()
})

Deno.test("Unsupported Content-Type", async () => {
  const port = 3003
  const server = bloom({
    seed,
    branch,
    quiet: true,
    port,
    unsupported: () => fall(415),
  })

  const unsupported = await get<string>(port, "/unexpected", {
    "Content-Type": "text/plain",
  })
  is(unsupported.status, 415)
  empty(unsupported.json!)

  server.shutdown()
})
