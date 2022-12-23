import { ModelType } from "../../types";

export interface City extends ModelType {
  name: string
  state: string
  country: string
  capital: boolean
  population: number
  regions: string[]
}