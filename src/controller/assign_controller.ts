/* eslint-disable @typescript-eslint/no-explicit-any */
import debug from 'debug';

const dLog = debug('firestore-orm:assign');
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
      return res.status(st).json(response);
    } catch (err: any) {
      const status = err.status || 422;
      dLog(__filename, '!!==>', err);
      if (process.env.NODE_ENV === 'production') {
        dLog(err);
        return res.status(status).send(err.message);
      } else {
        return res.status(status).send(err.message);
      }
    }
  };
};
