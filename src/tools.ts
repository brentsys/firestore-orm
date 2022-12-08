/* eslint-disable @typescript-eslint/no-explicit-any */
import _ from "lodash"

export function currencyValue(value: number): string {
  return Intl.NumberFormat("fr-FR", { style: "currency", currency: "XAF" }).format(value)
}

export function stringMapToObj(strMap: Map<string, any>) {
  const obj = Object.create(null);
  strMap.forEach((v, k) => {
    // We don’t escape the key '__proto__'
    // which can cause problems on older engines
    obj[k] = v;
  })

  return obj;
}

export function removeFunctions(obj: any): any {
  return _.omitBy(obj, (field) => typeof field === "function")
}

export function removeUndefined(obj: any): any {
  return _.omitBy(obj, (field) => {
    const emptyString = (typeof field === "string") && !field

    //console.log(`emptyString '${field}' = ${emptyString}`)
    return field === undefined || emptyString
  })
}

export function changeMapsToDictionnary(obj: any): any {
  const maps = _.pickBy(obj, (field) => field instanceof Map)
  const mapValues = _.mapValues(maps, map => {
    return stringMapToObj(map as Map<string, any>)
  })

  let temp = _.omit(obj, Object.keys(maps))
  temp = Object.assign(temp, mapValues)

  return temp
}