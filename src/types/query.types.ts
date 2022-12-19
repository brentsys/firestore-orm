/* eslint-disable @typescript-eslint/no-explicit-any */
import _ from 'lodash';
import { CollectionReference, DocumentChange, DocumentSnapshot, FieldPath, FirestoreError, OrderByDirection, Query, QueryDocumentSnapshot, WhereFilterOp } from './firestore';


export type QueryTuple = [string | FieldPath, WhereFilterOp, any];
export type QueryVar = QueryTuple;
export type OrderVar = [string | FieldPath, OrderByDirection];

export type SortField = [string | FieldPath, OrderByDirection | undefined];

export type QueryGroup = {
  parentPath?: string | null | undefined;
  queries?: QueryTuple[];
  sorts?: SortField[];
  cursor?: DocumentSnapshot;
  limit?: number;
};

export type ParentQueryGroup = QueryGroup & { parentPath: string }

export type XQG = QueryGroup | ParentQueryGroup

export type WhereFilterKey = 'eq' | 'ne' | 'lt' | 'lte' | 'gte' | 'gt' | 'in' | 'not-in';
export type WhereFilterArrayKey = 'array-contains' | 'array-contains-any';

export type DocSnap = DocumentSnapshot | QueryDocumentSnapshot;

type FilterKey = [WhereFilterKey, any];
type FilterArray = [WhereFilterArrayKey, any[]];
type WhereFilter = { [key: string]: FilterKey | FilterArray };

export interface QueryFilter {
  limit?: number;
  sort?: [string, OrderByDirection][];
  where?: WhereFilter;
}

type KeyFilter = [string, FilterKey | FilterArray];

const toWhereFilterOp: (queryOp: WhereFilterKey | WhereFilterArrayKey) => WhereFilterOp = (queryOp) => {
  switch (queryOp) {
    case 'eq':
      return '==';
    case 'ne':
      return '!=';
    case 'gt':
      return '>';
    case 'gte':
      return '>=';
    case 'lt':
      return '<';
    case 'lte':
      return '<=';
    default:
      return queryOp;
  }
};

const getFilterOp: (filter: KeyFilter) => QueryTuple = (filter) => {
  const filterOp = toWhereFilterOp(filter[1][0]);
  return [filter[0], filterOp, filter[1][1]];
};

export function toQueryGroup(filter: QueryFilter | undefined): QueryGroup {
  const qg: QueryGroup = {};
  if (!filter) return qg;
  const { limit, sort, where } = filter;
  if (limit) qg.limit = limit;
  if (sort) {
    const sortFields: SortField[] = [];
    sort.forEach((order) => {
      sortFields.push(order);
    });
    qg.sorts = sortFields;
  }
  if (where) {
    qg.queries = _.map(where, (value, key) => {
      const flt: KeyFilter = [key, value];
      return getFilterOp(flt);
    });
  }
  return qg;
}

export type QueryObserver<T> = {
  next?: (changes: DocumentChange<T>[]) => void;
  error?: (error: FirestoreError) => void;
  complete?: () => void;
}

export type DocumentObserver<T> = {
  next?: (snapshot: DocumentSnapshot<T>) => void;
  error?: (error: FirestoreError) => void;
  complete?: () => void;
}


export const makeQuery = <T>(qry: CollectionReference<T> | Query<T>, queryGroup: QueryGroup) => {
  const sorts = queryGroup.sorts || []
  const queries = queryGroup.queries || []
  queries.forEach(q => qry = qry.where(q[0], q[1], q[2]))
  sorts.forEach(s => qry = qry.orderBy(s[0], s[1]))
  if (queryGroup.cursor) {
    // const lastVisible = ref.doc(`${queryGroup.cursorId}`)
    qry = qry.startAfter(queryGroup.cursor)
  }
  if (queryGroup.limit) qry = qry.limit(queryGroup.limit)

  return qry
}
