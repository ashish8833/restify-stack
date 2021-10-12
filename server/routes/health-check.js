'use strict';

import bind from 'lodash.bind';
import pkg from 'bluebird';
const { resolve } = pkg;
import { Router as _Router } from 'restify-router';

class Model {
  constructor(config, logger) {
    this.config = config;
    this.logger = logger;
  }

  healthCheck() {
    let response = {
      healthy: true,
    };

    return resolve(response);
  }
}

class Controller {
  constructor(config, logger, model) {
    this.config = config;
    this.logger = logger;
    this.model = model;
  }

  healthCheck(req, res) {
    return this.model.healthCheck()
      .then((r) => {
        res.status(200);
        res.json({ response: r }); // eslint-disable-line am_camelcase
      })
      .catch((err) => {
        res.error(err);
      });
  }
}

function createModel(config, logger) { // eslint-disable-line no-unused-vars
  return new Model(config, logger);
}

function createController (config, logger) { // eslint-disable-line no-unused-vars
  const model = createModel(config, logger);

  return new Controller(config, logger, model);
}

export default function create(config, logger) { // eslint-disable-line no-unused-vars
  const router = new _Router(), // eslint-disable-line new-cap
        controller = createController(config, logger);

  router.get('/', bind(controller.healthCheck, controller));

  return router;
}