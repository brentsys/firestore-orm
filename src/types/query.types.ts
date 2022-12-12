/* eslint-disable @typescript-eslint/no-explicit-any */
import admin from 'firebase-admin';
import { ModelType } from './model.types';
import _ from 'lodash';

type OrderByDirection = admin.firestore.OrderByDirection;
type WhereFilterOp = admin.firestore.WhereFilterOp;

export type QueryTuple = [string | admin.firestore.FieldPath, WhereFilterOp, any];
export type QueryVar = QueryTuple;
export type OrderVar = [string | admin.firestore.FieldPath, OrderByDirection];

export type SortField = [string | admin.firestore.FieldPath, OrderByDirection | undefined];

export type QueryGroup<T extends ModelType = ModelType> = {
  parent?: T | null | undefined;
  queries?: QueryTuple[];
  sorts?: SortField[];
  cursorId?: string | number;
  limit?: number;
};

export type ParentQueryGroup<T extends ModelType> = QueryGroup<T> & { parent: T }

export type XQG<T extends ModelType> = QueryGroup<T> | ParentQueryGroup<T>

export type WhereFilterKey = 'eq' | 'ne' | 'lt' | 'lte' | 'gte' | 'gt' | 'in' | 'not-in';
export type WhereFilterArrayKey = 'array-contains' | 'array-contains-any';

export type DocSnap = admin.firestore.DocumentSnapshot | admin.firestore.QueryDocumentSnapshot;

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

export function toQueryGroup<P extends ModelType>(filter: QueryFilter | undefined): QueryGroup<P> {
  const qg: QueryGroup<P> = {};
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
