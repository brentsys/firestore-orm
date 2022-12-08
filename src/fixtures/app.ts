"use strict";

import express from "express";
import { assign } from "./controllers/assign_controller";
import { DummyController } from "./controllers/dummy_controller";
import "./fixture_data"


export const PORT = Number(process.env.PORT) || 3300;

const app = express();

app.get("/dummies", assign(DummyController))
app.get("/dummies/:id", assign(DummyController))
app.post("/dummies", assign(DummyController))
app.delete("/dummies/:id", assign(DummyController))
app.put("/dummies./id", assign(DummyController))

if (module === require.main) {
  // [START server]
  // Start the server
  app.listen(PORT, () => {
    //const port = server.address().port;
    console.log(`App listening on port ${PORT}`);
  });
  // [END server]
}

export default app
