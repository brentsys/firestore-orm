import { firestore } from "firebase-admin"

type WhereFilterOp = "<" | "<=" | "==" | "!=" | ">=" | ">" | "array-contains" | "in" | "array-contains-any" | "not-in"
type OrderByDirection = "desc" | "asc"

export class Query {
  constructor(readonly field: string, readonly comp: WhereFilterOp, readonly value: any) {
    if (field === undefined) throw new Error(`Invalid query with 'field' undefined`)
    if (comp === undefined) throw new Error(`Invalid query with 'comp' undefined`)
    if (value === undefined) throw new Error(`Invalid query with 'value' undefined`)
  }

  /*
  filter(list: any) {
    let value = this.value
    if (typeof value === "string") value = `'${value}'`
    let filterString: string
    let filterFn : (x: any)=>string
    if (value instanceof firestore.Timestamp) {
      filterString = `(x) => x.data().${this.field}.toMillis() ${this.comp} ${value.toMillis()}`;
    } else {
      filterString = `(x) => x.data().${this.field} ${this.comp} ${value}`;
    }
    //const filterFn = eval(filterString);
    return list.filter(filterFn);
  }*/
}

export interface QueryOrder {
  fieldPath: string | firestore.FieldPath
  directionStr?: OrderByDirection
}

// const InequalityOperators = [">", ">=", "<", "<="]
