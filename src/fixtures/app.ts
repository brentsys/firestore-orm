'use strict';

import express from 'express';
import { assignController } from '../controller/assign_controller';

import { DummyController } from './controllers/dummy_controller';
import { RecordModelController as RMC } from '../controller';
import debug from 'debug';
import './fixture_data';
import { ModelType } from '../types';
import { Dummy } from './models/dummy';
import { User } from './models/user';
import { UsersController } from './controllers/users.controller';

const dLog = debug('firestore-orm:app');

export const PORT = Number(process.env.PORT) || 3300;

const app = express();

// Parse JSON bodies for this app. Make sure you put
// `app.use(express.json())` **before** your route handlers!
app.use(express.json());

enum HttpMethods {
  GET = "get", POST = "post", PUT = "put", DELETE = "delete", PATCH = "patch"
}

const ID_METHODS = [HttpMethods.GET, HttpMethods.DELETE, HttpMethods.PATCH, HttpMethods.PUT]
const GROUP_METHODS = [HttpMethods.GET, HttpMethods.POST]

type IControllerType<Q extends ModelType> = new () => RMC<Q>;

function appCRUD<Q extends ModelType>(controller: IControllerType<Q>, methods?: HttpMethods[]) {
  const ct = new controller()
  const path = "/" + ct.repo.definition.name
  if (!methods) methods = [HttpMethods.GET, HttpMethods.POST, HttpMethods.PUT, HttpMethods.DELETE]
  methods.forEach(it => {
    const method = it
    const idPath = `${path}/:id`
    if (ID_METHODS.includes(it)) app[method](idPath, assignController(controller))
    if (GROUP_METHODS.includes(it)) app[method](path, assignController(controller))
  })
}

appCRUD<Dummy>(DummyController)
appCRUD<User>(UsersController)

/*
app.get('/dummies', assignController(DummyController));
app.get('/dummies/:id', assignController(DummyController));
app.post('/dummies', assignController(DummyController));
app.delete('/dummies/:id', assignController(DummyController));
app.put('/dummies./id', assignController(DummyController));
*/

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
