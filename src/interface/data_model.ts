import { DocumentData } from "../types/firestore";

export interface DataModel extends DocumentData {
  id: string | undefined;
}
