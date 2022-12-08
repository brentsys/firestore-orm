
import { RecordModel } from "../../record_model";
import { model } from '../../decorator';


@model({ name: "dummies" })
export class Dummy extends RecordModel {
  name!: string;
  platform!: string;
}
