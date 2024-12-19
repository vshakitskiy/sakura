export class SakuraResponse {
  public readonly body: BodyInit | null
  public readonly status: number
  public readonly headers?: HeadersInit
  constructor(
    status: number,
    // deno-lint-ignore no-explicit-any
    json?: any,
    headers?: HeadersInit,
  ) {
    this.status = status
    this.body = json ? JSON.stringify(json) : null
    this.headers = headers
  }

  return(): Response {
    return new Response(this.body, {
      status: this.status,
      headers: {
        "Content-type": "application/json",
        ...this.headers,
      },
    })
  }
}

// TODO: function name
export const res = (
  status: number,
  // deno-lint-ignore no-explicit-any
  json?: any,
  headers?: HeadersInit,
): SakuraResponse => {
  return new SakuraResponse(status, json, headers)
}
