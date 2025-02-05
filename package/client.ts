import { Cookies } from "./cookies.ts"
import type { ErrorHandler } from "./external.ts"
import { fall, SakuraError } from "./res.ts"
import type { Handler, HandlerArgAny, PetalAny } from "./route.ts"
import type { Branch, Match } from "./router.ts"
import type { GenSeed } from "./server.ts"
import type { Method as M, Schema } from "./utils.ts"
import type { StringRecord } from "./utils.ts"

export type Options<Method extends M> = Method extends "GET"
  ? Omit<_Options, "body">
  : _Options

type _Options = {
  body?: any
  cookies?: Record<string, string>
}

type ClientOptions<SeedFrom> = {
  error?: ErrorHandler<SeedFrom>
}

const defaultUrl = "http://localhost:8000"
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
    const meta = await this.before(path, method, options)

    try {
      const match = await this.request(
        meta,
        options,
      )
      if (!match) return null

      const res = await (async () => {
        try {
          const res = await match.handler(match.arg)
          return this.after(res, match.arg.cookies)
        } catch (err: unknown) {
          if (err instanceof SakuraError) {
            return fall(err.status, err.body, err.headers)
          }

          if (this.options.error) {
            try {
              return await this.options.error({
                error: err,
                seed: meta.initSeed,
              })
            } catch (_) {
              return fall(500)
            }
          }
          return fall(500)
        }
      })()

      const body = res.body ? await res.json() as Body : null

      return {
        res,
        body,
        cookies: match.arg.cookies,
      }
    } catch (error) {
      console.log(error)
      return null
    }
  }

  get = <Body>(path: `/${string}`, options?: Options<"GET">) =>
    this.method<"GET", Body>("GET", path, options)

  post = <Body>(path: `/${string}`, options?: Options<"POST">) =>
    this.method<"POST", Body>("POST", path, options)

  put = <Body>(path: `/${string}`, options?: Options<"PUT">) =>
    this.method<"PUT", Body>("PUT", path, options)

  patch = <Body>(path: `/${string}`, options?: Options<"PATCH">) =>
    this.method<"PATCH", Body>("PATCH", path, options)

  delete = <Body>(path: `/${string}`, options?: Options<"DELETE">) =>
    this.method<"DELETE", Body>("DELETE", path, options)

  private before = async <Method extends M>(
    path: `/${string}`,
    method: Method,
    options?: Options<Method>,
  ) => {
    const url = new URL(`${defaultUrl}${path}`)
    const req = new Request(url.toString(), {
      method,
    })

    if (options?.cookies) {
      const cookies = Object.entries(options.cookies)
        .map((entry) => entry.join("="))
        .join("; ")

      req.headers.set("Cookie", cookies)
    }

    const cookies = new Cookies(req)
    const initSeed = await this.genSeed(req, cookies)
    return {
      url,
      req,
      initSeed,
      cookies,
      method,
    }
  }

  private request = async <Method extends M>(
    { url, method, initSeed, cookies, req }: {
      url: URL
      req: Request
      initSeed: SeedFrom
      cookies: Cookies
      method: Method
    },
    options?: _Options,
  ): Promise<
    {
      handler: Handler<SeedTo, Method, Schema<any, any>>
      arg: HandlerArgAny<SeedTo>
    } | null
  > => {
    const match = this.match(method, url.pathname)

    if (!match) return null
    const { params, petal } = match

    const query = getQuery(url)

    const seed = await petal.mutation(initSeed)

    return {
      handler: petal.handler,
      arg: {
        req,
        cookies,
        seed,
        query,
        params,
        body: options?.body,
      },
    }
  }

  private after = (res: Response, cookies: Cookies) => {
    for (const cookie of cookies.parse()) {
      res.headers.append("set-cookie", cookie)
    }
    return res
  }
}

const getQuery = (url: URL) => {
  const query: StringRecord = {}
  for (const [key, val] of url.searchParams) {
    query[key] = val
  }
  return query
}
