import { fall, sakura } from "@vsh/sakura"
import { assertEquals } from "@std/assert"

export type Msg = { message: string }

export const baseSeed = () => sakura((req) => ({ req }))

export const ok = () => fall(200, { message: "ok" })
export const empty = () => fall(204)

export const get = async <T>(port: number, path: string) => {
  const req = await fetch(`http://localhost:${port}${path}`)
  const isEmpty = !req.body || req.headers.get("Content-Length") === "0"

  if (isEmpty) {
    await req.text()
  }

  return { json: isEmpty ? null : await req.json() as T, status: req.status }
}

export const is = <T>(f: T, s: T, m?: string) => assertEquals(f, s, m)

export const isN = <T>(f: T, m?: string) => assertEquals(f, null, m)
