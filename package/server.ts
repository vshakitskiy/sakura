/**
 * Contains utilities for creating and starting server.
 *
 * @example
 * ```ts
 * import { sakura, bloom } from "@vsh/sakura"
 *
 * const { seed, branch } = sakura((req) => ({ req }))
 *
 * const main = branch()
 * // ...
 *
 * bloom({
 *   seed,
 *   branch: main,
 *   port: 3000,
 *   log: true
 * })
 * @module
 * ```
 */

import { Branch } from "./router.ts"
import type {
  AfterHandler,
  BeforeHandler,
  ErrorHandler,
  Method,
  Return,
  UnknownHandler,
  UnsupportedHandler,
} from "./utils.ts"
import { fall, SakuraError } from "./res.ts"
import type { PetalAny } from "./route.ts"
import { Cookies } from "./cookies.ts"
import { getQuery } from "./external.ts"
import type { StringRecord } from "./external.ts"

/**
 * Creates request's inital seed.
 */
export type GenSeed<Seed> = (req: Request, cookies: Cookies) => Return<Seed>

/**
 * Initialize branch function with the seed provided.
 *
 * @example
 * ```ts
 * const { branch, seed } = sakura(req => ({
 *   req,
 *   getSession: async () => {
 *     // ...
 *   },
 *   ms: Date.now()
 * }))
 * ```
 */
export const sakura = <Seed>(
  seed: GenSeed<Seed>,
): {
  seed: GenSeed<Seed>
  branch: () => Branch<Seed, Seed, PetalAny>
} => ({
  seed,
  branch: () => Branch.init<Seed>(),
})

type HandlerOptions<InitSeed, CurrSeed, B> = {
  seed: GenSeed<InitSeed>
  branch: Branch<InitSeed, CurrSeed, PetalAny>
  unsupported?: UnsupportedHandler<InitSeed>
  unknown?: UnknownHandler<InitSeed>
  error?: ErrorHandler<InitSeed>
  before?: BeforeHandler<InitSeed, B>
  after?: AfterHandler<B>
}

type Handler = <InitSeed, CurrSeed, B = never>({
  seed,
  branch,
  error,
  unknown,
  unsupported,
  before,
  after,
}: HandlerOptions<InitSeed, CurrSeed, B>) => (req: Request) => Promise<Response>

export const handler: Handler = ({
  seed: init,
  branch,
  error,
  unknown,
  unsupported,
  before: bfr,
  after,
}) => {
  const matchFunc = branch.finalize()
  return async (req: Request) => {
    const url = new URL(req.url)
    const method = req.method as Method
    const cookies = new Cookies(req)
    const contentType = req.headers.get("Content-Type")
    const initSeed = await init(req, cookies)
    const before = bfr ? await bfr({ req, cookies, seed: initSeed }) : undefined
    let res: Response

    try {
      if (contentType && contentType !== "application/json") {
        if (unsupported)
          return await unsupported({ req, seed: initSeed, cookies })
        console.warn("Unsupported Content-Type header")
      }

      const match = matchFunc(method, url.pathname)
      if (!match)
        return unknown
          ? await unknown({ req, cookies, seed: initSeed })
          : fall(404, { message: "not found" })

      const { petal, params: rawParams } = match
      const seed = await petal.mutation(initSeed)

      const promiseResolve = []
      if (method !== "GET") {
        const body = await getBody(req)
        promiseResolve.push(
          petal.body ? petal.body.parse(body) : Promise.resolve(body),
        )
      } else promiseResolve.push(Promise.resolve(undefined))
      promiseResolve.push(
        petal.params
          ? petal.params.parse(rawParams)
          : Promise.resolve(rawParams),
      )
      promiseResolve.push(
        petal.query
          ? petal.query.parse(getQuery(url))
          : Promise.resolve(getQuery(url)),
      )
      const [body, params, query] = (await Promise.all(promiseResolve)) as [
        body: any,
        params: StringRecord,
        query: StringRecord,
      ]

      res = await petal.handler({
        seed,
        req,
        params,
        query,
        body,
        cookies,
      })
    } catch (err: unknown) {
      if (err instanceof SakuraError)
        res = fall(err.status, err.body, err.headers)
      else if (error)
        try {
          res = await error({ error: err, seed: initSeed })
        } catch (_) {
          res = fall(500, { message: "internal server error" })
        }
      else res = fall(500, { message: "internal server error" })
    }

    const parsedCookies = cookies.parse()
    for (const cookie of parsedCookies) {
      res.headers.append("Set-Cookie", cookie)
    }

    return after ? await after({ res, before: before! }) : res
  }
}

const getBody = (req: Request) => {
  const isInvalid =
    !req.body ||
    req.headers.get("Content-Length") === "0" ||
    !req.headers.get("Content-Type")

  if (isInvalid) return null

  return req.json()
}
