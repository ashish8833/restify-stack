'use strict';

const _ = require('lodash'),
      PromiseA = require('bluebird'),
      Router = require('restify-router'),
      Stats = require('../../stats');

class Model {
  constructor(config, logger) {
    this.config = config;
    this.logger = logger;
  }

  prometheus(contentType) {
    let metrics = Stats.metrics(contentType);

    return PromiseA.resolve(_.get(metrics, 'prometheus', {}));
  }
}

class Controller {
  constructor(config, logger, model) {
    this.config = config;
    this.logger = logger;
    this.model = model;
  }

  prometheus(req, res) {
    let contentType = req.accepts('application/json') ? 'json' : 'text';

    return this.model.prometheus(contentType)
      .then((r) => {
        res.set('Content-Type', r.contentType);
        res.send(r.metrics);
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

  _.forEach(config.get('stats.engines'), (engineConfig) => {
    if (engineConfig.enabled === true && !_.isEmpty(engineConfig.endpoint) && _.isFunction(controller[engineConfig.name])) {
      router.get(engineConfig.endpoint, _.bind(controller[engineConfig.name], controller));
    }
  });

  return router;
};