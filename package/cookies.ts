// Source: https://jsr.io/@std/http/1.0.12/cookie.ts

/** Cookie metadata: name, value and different attributes. */
export interface Cookie {
  /** Cookie's name. */
  name: string

  /** Cookie's value. */
  value: string

  /** Cookie's `Expires` attribute. Either explicit date or UTC milliseconds. */
  expires?: Date | number

  /** Cookie's `Max-Age` attribute. Must be a non-negative integer */
  maxAge?: number

  /** Cookie's `Domain` attribute. */
  domain?: string

  /** Cookie's `Path` attribute. */
  path?: string

  /** Cookie's `Secure` attribute. */
  secure?: boolean

  /** Cookie's `HTTPOnly` attribute.  */
  httpOnly?: boolean

  /** Cookie's `Partitioned` attribute. */
  partitioned?: boolean

  /**
   * Cookie's `SameSite` attribute.
   * Declare whether your cookie is restricted to a first-party or same-site context.
   */
  sameSite?: "Strict" | "Lax" | "None"

  /** Additional key value pairs. */
  unparsed?: string[]
}

/** Cookie storage, that is parsing request cookies and cookies that will append to response's `Set-Cookie` header. */
export class Cookies {
  private reqCookies: Record<string, string>
  private setCookies: Cookie[]
  private parsed: string[]

  constructor(req: Request) {
    this.reqCookies = getCookies(req.headers)
    this.setCookies = []
    this.parsed = []
  }

  /**
   * Appends cookie to the `Set-Cookie` header.
   *
   * @example
   * ```ts
   * branch().get("/", ({ cookies }) => {
   *   cookies.set({ name: "runtime", value: "deno" })
   *   cookies.set({ name: "test", value: "123" })
   *   return fall(200)
   * })
   * // -> Set-Cookie: runtime=deno,test=123
   * ```
   */
  public set = (cookie: Cookie): void => {
    const parsed = parseFromCookie(cookie)

    if (parsed) {
      this.setCookies.push(cookie)
      this.parsed.push(parsed)
    }
  }

  /**
   * Extracts all cookies from request.
   *
   * @example
   * ```ts
   * branch().get("/", ({ cookies }) => {
   *   const c = cookies.get<"runtime" | "test">()
   *   return fall(200, c.runtime)
   * })
   * ```
   */
  public get = <T extends string = string>() =>
    this.reqCookies as Record<T, string>

  /**
   * Lists all cookies that are appended with the `set()` method.
   *
   * @example
   * ```ts
   * branch().get("/", ({ cookies }) => {
   *   cookies.set({ name: "key", value: "val" })
   *   console.log(cookies.getSet())
   *   // -> { name: "key", value: "val" }
   *   return fall(200)
   * })
   * ```
   */
  public getSet = () => this.setCookies

  // @TODO: deleteCookie
  /**
   * Deletes cookie using `Set-Cookie` header.
   */
  public deleteCookie = (
    name: string,
    attributes?: Pick<
      Cookie,
      "path" | "domain" | "secure" | "httpOnly" | "partitioned"
    >,
  ) => {
    this.set({
      name,
      value: "",
      expires: new Date(0),
      ...attributes,
    })
  }

  /** Returns cookies from `set()` method parsed as a string. */
  public parse = () => this.parsed
}

/** Extracts cookies from the header as `Record`. */
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

/** Parses `Cookie` argument into ready-to-use string. */
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
