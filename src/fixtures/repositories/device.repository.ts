import { ModelDefinition } from '../../model/model_definition';
import { Repository } from '../../repository/repository';
import { Device } from '../models/device';

const deviceDefinition: ModelDefinition<Device> = {
  name: 'devices'
};

export class DeviceRepository extends Repository<Device> {
  definition = deviceDefinition

}
