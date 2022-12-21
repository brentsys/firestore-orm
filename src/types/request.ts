import { HttpMethods } from "./rest_api";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Body = { [key: string]: any };

export interface Request extends Express.Request {
  body: Body
  query: { [key: string]: string }
  path: string
  headers: { [key: string]: string }
  method: HttpMethods
  params: { [key: string]: string }
  originalUrl: string
}

// export type Request<T extends Body> = Express.Request & T
