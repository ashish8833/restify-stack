'use strict';

const _ = require('lodash'),
      PromiseA = require('bluebird'),
      Router = require('restify-router');

class Model {
  constructor(config, logger) {
    this.config = config;
    this.logger = logger;
  }

  healthCheck() {
    let response = {
      healthy: true,
    };

    return PromiseA.resolve(response);
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

module.exports.createModel = function (config, logger) { // eslint-disable-line no-unused-vars
  return new Model(config, logger);
};

module.exports.createController = function (config, logger) { // eslint-disable-line no-unused-vars
  const model = module.exports.createModel(config, logger);

  return new Controller(config, logger, model);
};

module.exports.create = function (config, logger) { // eslint-disable-line no-unused-vars
  const router = new Router.Router(), // eslint-disable-line new-cap
        controller = module.exports.createController(config, logger);

  router.get('/', _.bind(controller.healthCheck, controller));

  return router;
};