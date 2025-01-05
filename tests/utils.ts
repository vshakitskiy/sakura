import { fall, sakura } from "@vsh/sakura"
import type { GenSeed, Handler } from "@vsh/sakura"
import { assertEquals, assertExists, AssertionError } from "@std/assert"

export type Msg = { message: string }

export const baseSeed = () => sakura((req) => ({ req }))

export const run = async (
  petal: Handler<any, any>,
  seed: GenSeed<any>,
  req: Request = new Request(""),
) => {
  return await petal({
    params: {},
    query: {},
    req,
    seed: await seed(req),
  })
}

export const ok = () => fall(200, { message: "ok" })
export const plug = () => fall(204)

export const get = async <T>(
  port: number,
  path: string,
  headers?: HeadersInit,
) => {
  const req = await fetch(`http://localhost:${port}${path}`, {
    headers,
  })
  const isEmpty = !req.body || req.headers.get("Content-Length") === "0"

  if (isEmpty) {
    await req.text()
  }

  return { json: isEmpty ? null : await req.json() as T, status: req.status }
}

export const is = <T>(f: T, s: T, m?: string) => assertEquals(f, s, m)

export const exists = <T>(f: T, m?: string) => assertExists(f, m)

export const empty = <T>(f: T, m?: string) => {
  if (f !== undefined && f !== null) {
    const msgSuffix = m ? `: ${m}` : "."
    m = `Expected actual: "${f}" to not be null or undefined${msgSuffix}`
    throw new AssertionError(m)
  }
}

export const isN = <T>(f: T, m?: string) => assertEquals(f, null, m)
