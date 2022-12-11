// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Body = { [key: string]: any };

export type Request<T extends Body> = Express.Request & T
