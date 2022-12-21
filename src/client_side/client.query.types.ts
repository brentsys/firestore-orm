/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  DocumentSnapshot,
  FieldPath, FirestoreError, OrderByDirection,
  Query, query, where, orderBy, startAfter, limit,
  QueryConstraint,
  QueryDocumentSnapshot, WhereFilterOp, DocumentChange, DocumentData
} from 'firebase/firestore';
import _ from 'lodash';
import { BaseQueryGroup } from '../types';
import { ModelType } from '../types/model.types';


export type QueryTuple = [string | FieldPath, WhereFilterOp, any];
export type QueryVar = QueryTuple;
export type OrderVar = [string | FieldPath, OrderByDirection];

export type SortField = [string | FieldPath, OrderByDirection | undefined];

export type QueryGroup<T extends ModelType = DocumentData> = BaseQueryGroup & {
  cursor?: DocumentSnapshot<T>;
};

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

export function toQueryGroup(filter: QueryFilter | undefined): QueryGroup<DocumentSnapshot> {
  const qg: QueryGroup<DocumentSnapshot> = {};
  if (!filter) return qg;
  if (filter.limit) qg.limit = filter.limit;
  if (filter.sort) {
    const sortFields: SortField[] = [];
    filter.sort.forEach((order) => {
      sortFields.push(order);
    });
    qg.sorts = sortFields;
  }
  if (filter.where) {
    qg.queries = _.map(filter.where, (value, key) => {
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


export const makeQuery = <T extends ModelType = DocumentData>(qry: Query<T>, queryGroup: QueryGroup<T>) => {
  const queryConstraints: QueryConstraint[] = []
  const sorts = queryGroup.sorts || []
  const queries = queryGroup.queries || []
  queries.forEach(q => queryConstraints.push(where(q[0], q[1], q[2])))
  sorts.forEach(s => queryConstraints.push(orderBy(s[0], s[1])))
  if (queryGroup.cursor) {
    // const lastVisible = ref.doc(`${queryGroup.cursorId}`)
    queryConstraints.push(startAfter(queryGroup.cursor))
  }
  if (queryGroup.limit) queryConstraints.push(limit(queryGroup.limit))

  return query(qry, ...queryConstraints)
}
