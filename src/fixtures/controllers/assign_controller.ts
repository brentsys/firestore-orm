/* eslint-disable @typescript-eslint/no-explicit-any */
interface Processor {
  process: (req: any) => Promise<any>
}

interface ModelProcessor {
  new(): Processor
}


export const assign = function (creator: ModelProcessor) {
  const fn = new creator()
  return async function (req: any, res: any) {
    try {
      const response = await fn.process(req);
      const st = req.responseStatus || 200;
      return res.status(st).json(response);
    } catch (err: any) {
      const status = err.status || 422;
      console.error(__filename, "!!==>", err)
      if (process.env.NODE_ENV === 'production') {
        console.info(err)
        return res.status(status).send(err.message);
      } else {
        return res.status(status).send(err.message);
      }
    }
  }
}

