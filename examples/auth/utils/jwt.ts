import { create, getNumericDate, verify } from "djwt"
import { MessageError } from "@/sakura.ts"

export const getKey = (secret: string) => {
  const encoder = new TextEncoder()
  const bin = encoder.encode(secret)

  return crypto.subtle.importKey(
    "raw",
    bin,
    { name: "HMAC", hash: "SHA-512" },
    true,
    ["sign", "verify"],
  )
}

export const key = await getKey(Deno.env.get("JWT_SECRET")!)

export const day = 86400

// deno-lint-ignore no-explicit-any
export const sign = <T extends Record<string, any>>(
  data: T,
  exp: number = day * 3,
) =>
  create({
    alg: "HS512",
    typ: "JWT",
  }, {
    ...data,
    exp: getNumericDate(exp),
  }, key)

// deno-lint-ignore no-explicit-any
export const extract = async <T extends Record<string, any>>(jwt: string) => {
  try {
    return await verify(jwt, key) as T & { exp: number }
  } catch {
    throw new MessageError("AccessToken is invalid.")
  }
}
