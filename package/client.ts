/**
 * Contains a client utility.
 * @module
 */

import { Cookies } from "./cookies.ts"
import { getQuery } from "./external.ts"
import type { BeforeHandler, ErrorHandler } from "./external.ts"
import { fall, SakuraError } from "./res.ts"
import type { PetalAny } from "./route.ts"
import type { Branch, Match } from "./router.ts"
import type { GenSeed } from "./server.ts"
import type { Method as M } from "./utils.ts"

type Options<Method extends M> = Method extends "GET" ? Omit<_Options, "body">
  : _Options

type _Options = {
  body?: any
  cookies?: Record<string, string>
}

type ClientOptions<SeedFrom> = {
  error?: ErrorHandler<SeedFrom>
  unknown?: BeforeHandler<SeedFrom>
}

type ClientMethod<Body> = Promise<
  {
    res: Response
    body: Body | null
    cookies: Cookies
  }
>

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

    const res = await (async () => {
      const initSeed = await this.genSeed(req, cookies)

      try {
        const match = this.match(method, url.pathname)
        if (!match) {
          return this.options.unknown
            ? this.options.unknown({
              req,
              seed: initSeed,
            })
            : fall(404, { message: "not found" })
        }

        const { petal, params } = match
        const seed = await petal.mutation(initSeed)
        const query = getQuery(url)
        let body = undefined
        if (method !== "GET") {
          body = (options as _Options)?.body
          if (petal.body && body) body = petal.body.parse(body)
        }

        return await petal.handler({
          seed,
          req,
          params,
          query,
          body,
          cookies,
        })
      } catch (err) {
        if (err instanceof SakuraError) {
          return fall(err.status, err.body, err.headers)
        } else if (this.options.error) {
          try {
            return this.options.error({ error: err, seed: initSeed })
          } catch (_) {
            return fall(500, { message: "internal server error" })
          }
        } else return fall(500, { message: "internal server error" })
      }
    })()

    const body = res.body ? await res.json() as Body : null

    for (const cookie of cookies.parse()) {
      res.headers.append("set-cookie", cookie)
    }

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
   * Corresponds to the GET http method.
   */
  public post = <Body>(
    path: `/${string}`,
    options?: Options<"POST">,
  ): ClientMethod<Body> => this.method<"POST", Body>("POST", path, options)

  /**
   * Corresponds to the GET http method.
   */
  public put = <Body>(
    path: `/${string}`,
    options?: Options<"PUT">,
  ): ClientMethod<Body> => this.method<"PUT", Body>("PUT", path, options)

  /**
   * Corresponds to the GET http method.
   */
  public patch = <Body>(
    path: `/${string}`,
    options?: Options<"PATCH">,
  ): ClientMethod<Body> => this.method<"PATCH", Body>("PATCH", path, options)

  /**
   * Corresponds to the GET http method.
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
  })

  if (options?.cookies) {
    const cookies = Object.entries(options.cookies)
      .map((entry) => entry.join("="))
      .join("; ")

    req.headers.set("Cookie", cookies)
  }

  return req
}
