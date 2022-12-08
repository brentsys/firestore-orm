/* eslint-disable @typescript-eslint/no-explicit-any */
type Partial<T> = {
  [P in keyof T]?: T[P];
};
export declare type DeepPartial<T> = Partial<T> | {
  [P in keyof T]?: DeepPartial<T[P]>;
};

export type DataObject<T extends object> = T | DeepPartial<T>;

export interface AnyObject {
  [property: string]: any;
}
export type Options = AnyObject;