import { Cookies } from "./cookies.ts"
import type { PetalAny } from "./route.ts"
import type { Branch, Match, Schemas } from "./router.ts"
import type { GenSeed } from "./server.ts"
import type { Method as M, Schema } from "./utils.ts"
import { StringRecord } from "./utils.ts"

// export type ClientOptions<Method extends M> = {
//   zod?: Method extends "GET" ? Omit<Schemas<any>, "body"> : Schemas<any>

// }

export type ClientOptions<Method extends M> = Method extends "GET"
  ? Omit<Options, "body">
  : Options

type Options = {
  body?: any
  cookies?: Record<string, string>
}

export class SakuraClient<SeedFrom, SeedTo> {
  branch: Branch<SeedFrom, SeedTo, PetalAny>
  genSeed: GenSeed<SeedFrom>
  match: Match<SeedFrom, SeedTo>

  constructor(
    branch: Branch<SeedFrom, SeedTo, PetalAny>,
    genSeed: GenSeed<SeedFrom>,
  ) {
    this.branch = branch
    this.genSeed = genSeed
    this.match = branch.finalize()
  }

  get = async (path: `/${string}`, options?: ClientOptions<"GET">) => {
    const url = `http://localhost:8000${path}`

    const req = new Request(url, {
      method: "GET",
    })
    if (options?.cookies) {
      const cookies = Object.entries(options.cookies)
        .map((entry) => entry.join("="))
        .join("; ")

      req.headers.set("cookie", cookies)
    }
    const cookies = new Cookies(req)

    const match = this.match("GET", path)
    if (!match) return null

    const { params, petal } = match
    const initSeed = await this.genSeed(req, cookies)
    const seed = await petal.mutation(initSeed)
    const query = getQuery(new URL(url))

    return petal.handler({
      seed,
      req,
      cookies,
      params,
      query,
    })
  }
}

const getQuery = (url: URL) => {
  const query: StringRecord = {}
  for (const [key, val] of url.searchParams) {
    query[key] = val
  }
  return query
}
