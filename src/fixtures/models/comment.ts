import { ModelType } from "../../types";

export interface Comment extends ModelType {
  name: string
  email: string
  body: string
}