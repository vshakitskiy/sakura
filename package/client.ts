/**
 * Contains a client utility.
 * @module
 */

import { Cookies } from "./cookies.ts"
import type { PetalAny } from "./route.ts"
import type { Branch, Match } from "./router.ts"
import { type GenSeed, handler } from "./server.ts"
import type { ErrorHandler, Method as M, UnknownHandler } from "./utils.ts"

type Options<Method extends M> = Method extends "GET"
  ? Omit<_Options, "body">
  : _Options

type _Options = {
  body?: any
  cookies?: Record<string, string>
}

export type ClientOptions<SeedFrom> = {
  error?: ErrorHandler<SeedFrom>
  unknown?: UnknownHandler<SeedFrom>
}

type ClientMethod<Body> = Promise<{
  res: Response
  body: Body | null
  cookies: Cookies
}>

const defaultUrl = "http://localhost:8000"

/**
 * Initialize client with branch, seed and options provided.
 *
 * @example
 * ```ts
 * const { branch, seed } = sakura((req, cookies) => ({
 *   req, cookies
 * }))
 *
 * const app = branch()
 *   .get("/ping", () => fall(200, "pong"))
 *
 * const client = new SakuraClient(app, seed)
 * const res = await client.get("/ping")
 * // ...
 * ```
 */
export class SakuraClient<SeedFrom, SeedTo> {
  branch: Branch<SeedFrom, SeedTo, PetalAny>
  genSeed: GenSeed<SeedFrom>
  match: Match<SeedFrom, SeedTo>
  options: ClientOptions<SeedFrom>

  constructor(
    branch: Branch<SeedFrom, SeedTo, PetalAny>,
    genSeed: GenSeed<SeedFrom>,
    options?: ClientOptions<SeedFrom>,
  ) {
    this.branch = branch
    this.genSeed = genSeed
    this.match = branch.finalize()
    this.options = options || {}
  }

  private method = async <Method extends M, Body>(
    method: Method,
    path: `/${string}`,
    options?: Options<Method>,
  ) => {
    const url = new URL(`${defaultUrl}${path}`)
    const req = genRequest(url, method, options)
    const cookies = new Cookies(req)

    const res = await handler({
      branch: this.branch,
      seed: this.genSeed,
      unknown: this.options.unknown,
      error: this.options.error,
    })(req)

    const body = res.body ? ((await res.json()) as Body) : null
    cookies.fromResponse(res)

    return {
      res,
      body,
      cookies,
    }
  }

  /**
   * Corresponds to the GET http method.
   */
  public get = <Body>(
    path: `/${string}`,
    options?: Options<"GET">,
  ): ClientMethod<Body> => this.method<"GET", Body>("GET", path, options)

  /**
   * Corresponds to the POST http method.
   */
  public post = <Body>(
    path: `/${string}`,
    options?: Options<"POST">,
  ): ClientMethod<Body> => this.method<"POST", Body>("POST", path, options)

  /**
   * Corresponds to the PUT http method.
   */
  public put = <Body>(
    path: `/${string}`,
    options?: Options<"PUT">,
  ): ClientMethod<Body> => this.method<"PUT", Body>("PUT", path, options)

  /**
   * Corresponds to the PATCH http method.
   */
  public patch = <Body>(
    path: `/${string}`,
    options?: Options<"PATCH">,
  ): ClientMethod<Body> => this.method<"PATCH", Body>("PATCH", path, options)

  /**
   * Corresponds to the DELETE http method.
   */
  public delete = <Body>(
    path: `/${string}`,
    options?: Options<"DELETE">,
  ): ClientMethod<Body> => this.method<"DELETE", Body>("DELETE", path, options)
}

const genRequest = <Method extends M>(
  url: URL,
  method: Method,
  options?: Options<Method>,
) => {
  const req = new Request(url.toString(), {
    method,
    headers: {
      "Content-Type": "application/json",
    },
    body:
      method !== "GET"
        ? JSON.stringify((options as _Options)?.body)
        : undefined,
  })

  if (options?.cookies) {
    const cookies = Object.entries(options.cookies)
      .map((entry) => entry.join("="))
      .join("; ")

    req.headers.set("Cookie", cookies)
  }

  return req
}
