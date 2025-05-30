import type { HttpMethod, ResponseState } from "./types.d.ts"
import { status } from "./status.ts"
import { Context } from "./context.ts"

export type RouteHandler<KV extends Record<string, any>> = (context: {
  req: Request
  ctx: Context<KV>
  params: Record<string, string | undefined>
}) => void | Promise<void> | Response | Promise<Response>

export type MiddlewareHandler<
  KV extends Record<string, any>,
  NewKV extends Record<string, any>,
> = (context: { ctx: Context<KV> }) => NewKV | Promise<NewKV>

interface RoutePipelineStep<KV extends Record<string, any>> {
  type: "route"
  method: HttpMethod
  pathPattern: URLPattern
  handler: RouteHandler<KV>
}

interface MiddlewarePipelineStep<
  KV extends Record<string, any>,
  NewKV extends Record<string, any>,
> {
  type: "middleware"
  mw: MiddlewareHandler<KV, NewKV>
}

type PipelineStep = RoutePipelineStep<any> | MiddlewarePipelineStep<any, any>

export class Router<KV extends Record<string, any>> {
  public pipeline: PipelineStep[] = []
  private kv: KV

  constructor(kv?: KV) {
    this.kv = kv || ({} as KV)
  }

  private addRoute = (
    method: HttpMethod,
    path: string,
    handler: RouteHandler<KV>,
  ): this => {
    this.pipeline.push({
      type: "route",
      method,
      pathPattern: new URLPattern({ pathname: path }),
      handler,
    })

    return this
  }

  get(path: string, handler: RouteHandler<KV>): this {
    return this.addRoute("GET", path, handler)
  }

  post(path: string, handler: RouteHandler<KV>): this {
    return this.addRoute("POST", path, handler)
  }

  put(path: string, handler: RouteHandler<KV>): this {
    return this.addRoute("PUT", path, handler)
  }

  delete(path: string, handler: RouteHandler<KV>): this {
    return this.addRoute("DELETE", path, handler)
  }

  patch(path: string, handler: RouteHandler<KV>): this {
    return this.addRoute("PATCH", path, handler)
  }

  with = <NextKV extends Record<string, any>>(
    mw: MiddlewareHandler<KV, NextKV>,
  ): Router<NextKV> => {
    this.pipeline.push({
      type: "middleware",
      mw,
    })

    return this as unknown as Router<NextKV>
  }

  join = (...routes: Router<KV>[]): Router<KV> => {
    const router = new Router<KV>()
    router.pipeline = [...this.pipeline]

    for (const route of routes) {
      router.pipeline.push(...route.pipeline)
    }

    return router
  }

  handler = (): ((req: Request) => Promise<Response>) => {
    return async (req: Request): Promise<Response> => {
      const url = new URL(req.url)
      const res: ResponseState = {
        active: false,
        body: "Not Found",
        status: status.notFound,
        headers: new Headers({ "Content-Type": "text/plain;charset=utf-8" }),
      }

      const ctx = new Context(req, { ...this.kv }, res)

      try {
        for (const step of this.pipeline) {
          if (step.type === "middleware") {
            const newKV = await step.mw({ ctx })
            ctx.kv = newKV

            if (ctx.res.active) {
              return new Response(ctx.res.body, {
                status: ctx.res.status,
                headers: ctx.res.headers,
              })
            }
          } else if (step.type === "route") {
            const match = step.pathPattern.exec({ pathname: url.pathname })

            if (match && req.method === step.method) {
              ctx.params = match.pathname.groups

              const handlerRes = await step.handler({
                req,
                ctx,
                params: match.pathname.groups,
              })

              if (handlerRes instanceof Response) {
                return handlerRes
              }

              return new Response(ctx.res.body, {
                status: ctx.res.status,
                headers: ctx.res.headers,
              })
            }
          }
        }

        return new Response(res.body, {
          status: res.status,
          headers: res.headers,
        })
      } catch (err) {
        console.log("[Sakura Framework Error]", err)

        return new Response("Internal Server Error", {
          status: status.internalServerError,
          headers: new Headers({ "Content-Type": "text/plain;charset=utf-8" }),
        })
      }
    }
  }
}
