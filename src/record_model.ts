/* eslint-disable @typescript-eslint/no-explicit-any */
import { QueryGroup, SortField } from "./types/query.types";
import { AnyObject, DataObject } from "./types/common"
import { changeMapsToDictionnary, removeFunctions, removeUndefined } from "./tools";
import { ModelType } from "./types/model.types";
import { CollectionReference, DocumentData, DocumentSnapshot, QueryDocumentSnapshot, SetOptions, Timestamp } from "./types/firestore";


//export type Constructor = { new(...args: any[]): {} }

export interface Constructor<T extends RecordModel = RecordModel> {
  new(data?: AnyObject, parent?: ModelType): T
}

export type ModelCreator<T extends RecordModel = RecordModel> = Constructor<T> & {
  definition: ModelDefinition;
  /*
  getList: (queryGroup: QueryGroup) => Promise<T[]>
  delete: (id: string, parent?: ModelType) => Promise<void>
  save: (record: T) => Promise<T>
  make: (data: DocumentData, parent: ModelType | undefined | null) => T
  getById: (id: string, parent: ModelType | undefined | null) => Promise<T>
  getCollectionReference: (parent: ModelType | undefined | null) => CollectionReference
  find: (queryGroup: QueryGroup) => Promise<T>
  add: (data: DocumentData, parent: ModelType | undefined | null) => Promise<T>
  set: (id: string, data: DocumentData, parent: ModelType | undefined | null, options: SetOptions) => Promise<T>
  fromQuerySnap: (parent: ModelType | undefined | null) => (doc: QueryDocumentSnapshot) => T
  fromDoc: (doc: DocumentSnapshot) => T
  deleteGroup: (idx: string[], parent: ModelType | undefined | null) => Promise<any[]>
  */
}

export interface DataSyncSettings {
  table: string;
  field: string;
  sort: SortField[]
}

export interface ModelSettings {

  /**
   * Description of the model
   */
  description?: string;

  /**
   * firestore ProjectId
   */
  projectId?: string;

  /**
   * Prevent clients from setting the auto-generated ID value manually
   */
  forceId?: boolean;

  /**
   * Hides properties from response bodies
   */
  hiddenProperties?: string[];

  /**
   * Scope enables you to set a scope that will apply to every query made by the model's repository
   */
  scope?: object;

  /**
   * Specifies whether the model accepts only predefined properties or not
   */
  strict?: boolean | "filter";

  /**
   * Specify if the model is activable
   */
  activable?: boolean
  [name: string]: any;
}

export interface ModelDefinitionSyntax {
  name: string;
  settings?: ModelSettings;
  updateVersion?: (record: any) => Promise<void>
  [attribute: string]: any;
}

type nameOrSettings = string | ModelDefinitionSyntax

export class ModelDefinition {
  name: string
  activable?= false
  settings?: ModelSettings;

  constructor(params: nameOrSettings) {
    if (typeof params === "string") {
      this.name = params
    } else {
      this.name = params.name
      this.activable = !!params.settings?.activable
      this.settings = params.settings
    }
  }
}

export abstract class RecordModel implements ModelType {

  id: string | undefined
  createdAt!: Timestamp
  modelName!: string
  version?: number

  getHiddenFields: () => string[] = () => []

  postInit: (data?: AnyObject, parent?: ModelType) => void = () => {/**  */ }

  static get modelName(): string {
    let _a;

    return ((_a = this.definition) === null || _a === void 0 ? void 0 : _a.name) || this.name;
  }
  static definition: ModelDefinition;

  static getList: <Q extends ModelType>(queryGroup: QueryGroup) => Promise<Q[]>
  static find: <Q extends ModelType>(queryGroup: QueryGroup) => Promise<Q>
  static add: <Q extends ModelType>(data: DocumentData, parent: ModelType | undefined | null) => Promise<Q>
  static set: <Q extends ModelType>(id: string, data: DocumentData, parent: ModelType | undefined | null, options: SetOptions) => Promise<Q>
  static getById: <Q extends ModelType>(id: string, parent: ModelType | undefined | null) => Promise<Q>
  static fromQuerySnap: <Q extends ModelType>(parent: ModelType | undefined | null) => (doc: QueryDocumentSnapshot) => Q
  static fromDoc: <Q extends ModelType>(doc: DocumentSnapshot) => Q
  static getCollectionReference: (parent: ModelType | undefined | null) => CollectionReference
  static delete: (id: string, parent: ModelType | undefined | null) => Promise<void>
  static deleteGroup: (idx: string[], parent: ModelType | undefined | null) => Promise<any[]>
  static make: <Q extends RecordModel>(data: DocumentData, parent: ModelType | undefined | null) => Q
  static save: <Q extends ModelType>(record: Q) => Promise<Q>

  beforeSave = () => {/** */ }

  getRecordId: () => string | undefined = () => undefined

  objectData = (obj?: any) => {
    if (obj === undefined) obj = {}
    let temp = Object.assign(obj, this)
    temp = changeMapsToDictionnary(temp)
    temp = removeFunctions(temp)
    temp = removeUndefined(temp)

    return temp
  }

  documentData = () => this.objectData() as DocumentData

  /**
   * Serialize into a plain JSON object
   */
  //toJSON(): Object;

  /**
   * Convert to a plain object as DTO
   *
   * If `ignoreUnknownProperty` is set to false, convert all properties in the
   * model instance, otherwise only convert the ones defined in the model
   * definitions.
   *
   * See function `asObject` for each property's conversion rules.
   */
  //toObject(options?: Options): Object;
  constructor(data?: DataObject<RecordModel>, readonly parent: ModelType | undefined = undefined) {
    //Object.assign(this, _.omit(data, 'modelName'))
  }
}

export class BaseModel extends RecordModel {
  constructor(couple: [string, string], parent: ModelType | undefined) {
    super(undefined, parent)
    Object.assign(this, { modelName: couple[0], id: couple[1] })
  }
}