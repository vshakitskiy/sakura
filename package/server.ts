/**
 * Contains functions/classes related to creating and starting server.
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
import type { Method } from "./router.ts"
import { SakuraError } from "./res.ts"
import { fall } from "./res.ts"
import type { SafeParseReturnType as SafeParse } from "zod"

type RecordRaw = {
  [x: string]: any
}

/**
 * Creates request's inital seed.
 */
export type GenSeed<Seed> = (req: Request) => Seed | Promise<Seed>

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
export const sakura = <Seed>(seed: GenSeed<Seed>): {
  seed: GenSeed<Seed>
  branch: () => Branch<Seed, Seed>
} => ({
  seed,
  branch: () => Branch.create<Seed>(),
})

/**
 * Starts server with the options provided.
 *
 * @example
 * ```ts
 * const mainBranch = branch().get("/", (req, seed) => {
 *   // ...
 * })
 *
 * bloom({
 *   seed,
 *   branch: mainBranch,
 *   // ...
 * })
 * ```
 */
export const bloom = <InitSeed, CurrSeed>({
  seed: init,
  branch,
  port = 8000,
  unknown,
  error,
  unsupported,
  logger,
  quiet,
}: {
  seed: GenSeed<InitSeed>
  branch: Branch<InitSeed, CurrSeed>
  port?: number
  unknown?: ({ req, seed }: {
    req: Request
    seed: InitSeed
  }) => Promise<Response> | Response
  error?: (
    { error, seed }: { error: unknown; seed: InitSeed },
  ) => Promise<Response> | Response
  unsupported?: (
    { req, seed }: { req: Request; seed: InitSeed },
  ) => Promise<Response> | Response
  logger?:
    | (({ req, res, now }: {
      req: Request
      res: Response
      now: number
    }) => void)
    | boolean
  quiet?: boolean
}): Deno.HttpServer<Deno.NetAddr> => {
  return Deno.serve({
    port,
    onListen: () =>
      quiet || console.log(
        `%c🌸 Blooming on %chttp://localhost:${port}/`,
        "color: pink",
        "color: pink; font-weight: bold",
      ),
  }, async (req) => {
    const now = Date.now()
    const url = new URL(req.url)

    const resp = await (async () => {
      const initSeed = await init(req)

      try {
        if (
          req.headers.get("Content-Type") &&
          req.headers.get("Content-Type") !== "application/json"
        ) {
          if (unsupported) return unsupported({ req, seed: initSeed })

          console.log(
            `%cWarning: unsupported Content-Type header`,
            "color: yellow",
          )
        }

        const match = branch.match(req.method as Method, url.pathname)

        if (!match) {
          if (unknown) return unknown({ req, seed: initSeed })
          else return fall(404, { message: "not found" })
        }
        const { handler: { mutation, petal, schemas } } = match
        const seed = await mutation(initSeed)

        let params: SafeParse<RecordRaw, RecordRaw> | RecordRaw = match.params
        let query: SafeParse<RecordRaw, RecordRaw> | RecordRaw = getQuery(url)
        let json: SafeParse<any, any> | any = await getBody(req)

        if (schemas) {
          if (schemas.params) params = schemas.params.safeParse(params)
          if (schemas.query) query = schemas.query.safeParse(query)
          if (schemas.body) json = schemas.body.safeParse(json)
        }

        return petal({
          req,
          seed,
          params,
          query,
          json: req.method === "GET" ? undefined : json,
        })
      } catch (err: unknown) {
        if (err instanceof SakuraError) return fall(err.status, err.body)
        else if (error) {
          try {
            return error({ error: err, seed: initSeed })
          } catch (_) {
            return fall(500, { message: "internal server error" })
          }
        } else return fall(500, { message: "internal server error" })
      }
    })()
    if (logger) {
      if (typeof logger === "boolean") defaultLogger(now, req, resp, url)
      else logger({ req, res: resp, now })
    }

    return resp
  })
}

const getQuery = (url: URL) => {
  const query: {
    [x: string]: any
  } = {}
  for (const [key, val] of url.searchParams) {
    query[key] = val
  }
  return query
}

const getBody = async (req: Request) => {
  const isInvalid = !req.body ||
    req.headers.get("Content-Length") === "0" ||
    !req.headers.get("Content-Type")

  if (isInvalid) return null

  try {
    return await req.json()
  } catch (_) {
    return null
  }
}

const defaultLogger = (now: number, req: Request, res: Response, url: URL) => {
  const ms = Date.now() - now
  console.log(
    `%c${req.method} %c${url.pathname} %c${res.status} ${ms}ms`,
    "color: blue",
    "color: #fff",
    "color: green",
  )
}
