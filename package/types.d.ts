export type HttpMethod =
  | "GET"
  | "POST"
  | "PUT"
  | "DELETE"
  | "PATCH"
  | "HEAD"
  | "OPTIONS"
  | "TRACE"
  | "CONNECT"

export interface ResponseState {
  active: boolean
  body: BodyInit | null
  status: number
  headers: Headers
  // response?: Response
}
