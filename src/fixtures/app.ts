'use strict';

import express from 'express';
import { assignController } from '../controller/assign_controller';
import { DummyController } from './controllers/dummy_controller';
import debug from 'debug';
import './fixture_data';

const dLog = debug('firestore-orm:app');

export const PORT = Number(process.env.PORT) || 3300;

const app = express();

app.get('/dummies', assignController(DummyController));
app.get('/dummies/:id', assignController(DummyController));
app.post('/dummies', assignController(DummyController));
app.delete('/dummies/:id', assignController(DummyController));
app.put('/dummies./id', assignController(DummyController));

if (module === require.main) {
  // [START server]
  // Start the server
  app.listen(PORT, () => {
    // const port = server.address().port;
    dLog(`App listening on port ${PORT}`);
  });
  // [END server]
}

export default app;
