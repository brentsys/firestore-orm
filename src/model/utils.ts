import { firestore } from 'firebase-admin';

type Field = { [key: string]: any }

function noCustProps(obj: any): boolean {
  return Object.getPrototypeOf(obj) === Object.prototype
}

function subObject<T>(obj: Array<T>) {
  return obj.reduce((acc: Field, cur: any, idx: number) => {
    acc[idx.toString()] = cur
    return acc
  }, {})
}

export function hasNoCustomProperties(obj: any): boolean {
  let reducer = (acc: boolean, elm: any) => {
    if (!acc) return acc
    return hasNoCustomProperties(elm)
  }
  if (obj instanceof Object) {
    if (obj instanceof Array) {
      return obj.reduce(reducer, true)
    } else {
      if (obj instanceof firestore.Timestamp) return true
      if (noCustProps(obj)) {
        let values = Object.keys(obj).map(x => obj[x])
        return values.reduce(reducer, true)
      } else return false
    }
  } else return true
}

export function getCustomProperties(obj: Field): string[] {
  return Object.keys(obj).reduce((acc: string[], key: string) => {
    let element = obj[key]
    if (!hasNoCustomProperties(element)) {
      let subObj = element instanceof Array ? subObject(element) : element
      if (hasNoCustomProperties(subObj)) acc.push(key)
      else {
        let subprops = getCustomProperties(subObj)
        if (subprops.length == 0) acc.push(key)
        else subprops.forEach(soKey => acc.push([key, soKey].join("::")))
      }
    }
    return acc
  }, [])
}

export function notEmpty<TValue>(value: TValue | null | undefined): value is TValue {
  return value !== null && value !== undefined;
}