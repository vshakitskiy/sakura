// Source: https://jsr.io/@std/http/1.0.12/cookie.ts

// @TODO: jsdocs
// @TODO: delete cookie

export interface Cookie {
  name: string
  value: string
  expires?: Date | number
  maxAge?: number
  domain?: string
  path?: string
  secure?: boolean
  httpOnly?: boolean
  partitioned?: boolean
  sameSite?: "Strict" | "Lax" | "None"
  unparsed?: string[]
}

export class Cookies {
  private reqCookies: Record<string, string>
  private setCookies: Cookie[]
  private parsed: string[]

  constructor(req: Request) {
    this.reqCookies = getCookies(req.headers)
    this.setCookies = []
    this.parsed = []
  }

  public set = (cookie: Cookie) => {
    const parsed = parseFromCookie(cookie)

    if (parsed) {
      this.setCookies.push(cookie)
      this.parsed.push(parsed)
    }
  }

  public get = <T extends string = string>() =>
    this.reqCookies as Record<T, string>

  public getSet = () => this.setCookies

  public parse = () => this.parsed.join(", ")
}

export const getCookies = (headers: Headers) => {
  const cookie = headers.get("Cookie")
  if (cookie !== null) {
    const out: Record<string, string> = {}
    const c = cookie.split(";")
    for (const kv of c) {
      const [cookieKey, ...cookieVal] = kv.split("=")
      if (cookieKey === undefined) {
        throw new SyntaxError("Cookie cannot start with '='")
      }
      const key = cookieKey.trim()
      out[key] = cookieVal.join("=")
    }
    return out
  }
  return {}
}

export const parseFromCookie = (cookie: Cookie): string => {
  if (!cookie.name) return ""

  const out: string[] = []

  validateName(cookie.name)
  validateValue(cookie.name, cookie.value)
  out.push(`${cookie.name}=${cookie.value}`)

  if (cookie.name.startsWith("__Secure")) cookie.secure = true
  if (cookie.name.startsWith("__Host")) {
    cookie.path = "/"
    cookie.secure = true
    delete cookie.domain
  }
  if (cookie.secure) out.push("Secure")
  if (cookie.httpOnly) out.push("HttpOnly")
  if (cookie.partitioned) out.push("Partitioned")
  if (typeof cookie.maxAge === "number" && Number.isInteger(cookie.maxAge)) {
    if (cookie.maxAge < 0) {
      throw new RangeError(
        `Cannot serialize cookie as Max-Age must be >= 0: received ${cookie.maxAge}`,
      )
    }
    out.push(`Max-Age=${cookie.maxAge}`)
  }
  if (cookie.domain) {
    validateDomain(cookie.domain)
    out.push(`Domain=${cookie.domain}`)
  }
  if (cookie.sameSite) out.push(`SameSite=${cookie.sameSite}`)
  if (cookie.path) {
    validatePath(cookie.path)
    out.push(`Path=${cookie.path}`)
  }
  if (cookie.expires) {
    const { expires } = cookie
    const date = typeof expires === "number" ? new Date(expires) : expires
    out.push(`Expires=${date.toUTCString()}`)
  }
  if (cookie.unparsed) out.push(cookie.unparsed.join("; "))

  return out.join("; ")
}

const FIELD_CONTENT_REGEXP = /^(?=[\x20-\x7E]*$)[^()@<>,;:\\"\[\]?={}\s]+$/

const validateName = (name: string | undefined | null) => {
  if (name && !FIELD_CONTENT_REGEXP.test(name)) {
    throw new SyntaxError(`Invalid cookie name: "${name}"`)
  }
}

const validatePath = (path: string | null) => {
  if (path === null) {
    return
  }
  for (let i = 0; i < path.length; i++) {
    const c = path.charAt(i)
    if (
      c < String.fromCharCode(0x20) || c > String.fromCharCode(0x7E) ||
      c === ";"
    ) {
      throw new SyntaxError(
        `Cookie path "${path}" contains invalid character: "${c}"`,
      )
    }
  }
}

const validateValue = (name: string, value: string | null) => {
  if (value === null) return
  for (let i = 0; i < value.length; i++) {
    const c = value.charAt(i)
    if (
      c < String.fromCharCode(0x21) || c === String.fromCharCode(0x22) ||
      c === String.fromCharCode(0x2c) || c === String.fromCharCode(0x3b) ||
      c === String.fromCharCode(0x5c) || c === String.fromCharCode(0x7f)
    ) {
      throw new SyntaxError(
        "RFC2616 cookie '" + name + "' cannot contain character '" + c + "'",
      )
    }
    if (c > String.fromCharCode(0x80)) {
      throw new SyntaxError(
        "RFC2616 cookie '" + name +
          "' can only have US-ASCII chars as value: It contains 0x" +
          c.charCodeAt(0).toString(16),
      )
    }
  }
}

const validateDomain = (domain: string) => {
  const char1 = domain.charAt(0)
  const charN = domain.charAt(domain.length - 1)
  if (char1 === "-" || charN === "." || charN === "-") {
    throw new SyntaxError(
      "Invalid first/last char in cookie domain: " + domain,
    )
  }
}
