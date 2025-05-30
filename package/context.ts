import type { ResponseState } from "./internal/response.ts"

export class Context<KV extends Record<string, any> = Record<string, any>> {
  public readonly req: Request
  public kv: KV
  public params: Record<string, string | undefined>

  private _response: ResponseState

  constructor(
    req: Request,
    initKV: KV,
    response: ResponseState,
    params: Record<string, string | undefined> = {},
  ) {
    this.req = req
    this.kv = initKV
    this.params = params
    this._response = response
    this.params = params
  }

  json = (status: number, data: any): void => {
    this._response.active = true
    this._response.body = JSON.stringify(data)
    this._response.status = status
    this._response.headers.set("Content-Type", "application/json;charset=utf-8")
    // this._response.response = undefined
  }

  text = (status: number, text: string): void => {
    this._response.active = true
    this._response.body = text
    this._response.status = status
    this._response.headers.set("Content-Type", "text/plain;charset=utf-8")
    // this._response.response = undefined
  }

  html = (status: number, html: string): void => {
    this._response.active = true
    this._response.body = html
    this._response.status = status
    this._response.headers.set("Content-Type", "text/html;charset=utf-8")
    // this._response.response = undefined
  }

  status = (status: number): void => {
    this._response.active = true
    this._response.status = status
    this._response.body = null
    // this._response.response = undefined
  }

  header = (name: string, value: string): void => {
    this._response.headers.set(name, value)
  }

  headers = (headers: Record<string, string>): void => {
    for (const [name, value] of Object.entries(headers)) {
      this._response.headers.set(name, value)
    }
  }

  get res(): ResponseState {
    return this._response
  }
}
