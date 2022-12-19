/* eslint-disable @typescript-eslint/no-explicit-any */
import { AxiosError } from 'axios';
import debug from 'debug';

const dLog = debug('test:firestore-orm:assign');
interface Processor {
  process: (req: any) => Promise<any>;
}

type ModelProcessor = new () => Processor;

export const assignController = (creator: ModelProcessor) => {
  const fn = new creator();
  return async (req: any, res: any) => {
    try {
      const response = await fn.process(req);
      const st = req.responseStatus || 200;
      if (st > 300) {
        dLog(__filename, 'status', st);
      }
      return res.status(st).json(response);
    } catch (err: any) {
      if (err instanceof AxiosError) {
        const status = err.response?.status || 422;
        const message = err.response?.data ?? err.message
        return res.status(status).send(message)
      } else {
        const status = err.status || 422;
        dLog(__filename, '!!==>', err);
        return res.status(status).send(err.message);
      }
    }
  };
};
