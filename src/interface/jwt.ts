interface Header {
  kid: string,
  ref?: string,
  alg: string
}

interface Anything {
  [key: string]: any;
}

export interface Payload extends Anything {
  iss: string,
  iat: number,
  nonce?: string,
  sub?: string,
  aud?: string,
  host?: string
}

export interface FullDecoded {
  header: Header
  payload: Payload
  signature: string
}