import { fall, sakura } from "@vsh/sakura"
import { assertEquals, assertExists, AssertionError } from "@std/assert"

export const baseSeed = () => sakura((req, cookies) => ({ req, cookies }))

export const ok = () => fall(200, "ok")
export const plug = () => fall(204)

export const is = <T>(f: T, s: T, m?: string) => assertEquals(f, s, m)
export const exists = <T>(f: T, m?: string) => assertExists(f, m)

export const empty = <T>(f: T, m?: string) => {
  if (f !== undefined && f !== null) {
    const msgSuffix = m ? `: ${m}` : "."
    m = `Expected actual: "${f}" to be null or undefined${msgSuffix}`
    throw new AssertionError(m)
  }
}
