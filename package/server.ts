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

// TODO: fall(req, res, seed | meta + res) method (After request handler)
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
  // TODO: seed in error handler
  error?: ({ error }: { error: unknown }) => Promise<Response> | Response
  logger?: boolean
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
    const time = Date.now()
    const url = new URL(req.url)

    const resp = await (async () => {
      try {
        const match = branch.match(req.method as Method, url.pathname)
        const initSeed = await init(req)

        if (!match) {
          if (unknown) return await unknown({ req, seed: initSeed })
          else return fall(404, { message: "not found" })
        }
        const { handler: { mutation, petal, z } } = match
        const seed = await mutation(initSeed)

        let params: SafeParse<RecordRaw, RecordRaw> | RecordRaw = match.params
        let query: SafeParse<RecordRaw, RecordRaw> | RecordRaw = getQuery(url)
        let json: SafeParse<any, any> | any = await getBody(req)

        if (z) {
          if (z.params) params = z.params.safeParse(params)
          if (z.query) query = z.query.safeParse(query)
          if (z.body && json) json = z.body.safeParse(json)
        }

        const resp = await petal({
          req,
          seed,
          params,
          query,
          json,
        })

        return resp
      } catch (err: unknown) {
        if (err instanceof SakuraError) return fall(err.status, err.body)
        else if (error) {
          try {
            return await error({ error: err })
          } catch (_) {
            return fall(500, { message: "internal server error" })
          }
        } else return fall(500, { message: "internal server error" })
      }
    })()
    if (logger) defaultLogger(time, req, resp, url)

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
    // TODO: 415 for non json body? handler?
    req.headers.get("Content-Type") !== "application/json"
  if (isInvalid) return null

  try {
    return await req.json()
  } catch (_) {
    return null
  }
}

const defaultLogger = (time: number, req: Request, res: Response, url: URL) => {
  const ms = Date.now() - time
  console.log(
    `%c${req.method} %c${url.pathname} %c${res.status} ${ms}ms`,
    "color: blue",
    "color: #fff",
    "color: green",
  )
}
