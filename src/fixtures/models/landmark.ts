import { ModelType } from "../../types";

export interface Landmark extends ModelType {
  name: string
  state: string
  country: string
  capital: boolean
  population: number
  regios: string[]
}