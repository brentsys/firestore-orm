import { RecordModelController } from "../../controller";
import { Device } from "../models/device";
import { DeviceRepository } from "../repositories/device.repository";

export class DevicesController extends RecordModelController<Device> {
  repo = new DeviceRepository();
}