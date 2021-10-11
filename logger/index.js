'use strict';

const _ = require('lodash'),
      PromiseA = require('bluebird'),
      Rollbar = require('rollbar');


class DummyRollbar {
  error() {}
}

/**
 * Logger abstraction supporting multiple logging engines.
 */
class Logger {
  constructor(config) {
    const me = this;

    this.name = 'logger';

    this.LEVEL_INFO = 'info';
    this.LEVEL_WARN = 'warn';
    this.LEVEL_ERROR = 'error';
    this.LEVEL_DEBUG = 'debug';

    this.config = config;
    this.enabled = this.config.get('logging.enabled', false);
    this.defaultLevel = this.config.get('logging.defaultLevel', 'info');
    this.engines = {};

    // rollbar init
    var rollbarConfig = this.config.get('rollbar');
    if (rollbarConfig && rollbarConfig.accessToken && this.config.get('developmentMode') !== true) {
      this.rollbar = new Rollbar({
        accessToken: rollbarConfig.accessToken,
        environment: process.NODE_ENV,
        exitOnUncaughtException: true
      });
    } else {
      this.rollbar = new DummyRollbar();
    }

    _.forEach(this.config.get('logging.engines'), (engineConfig) => {
      if (engineConfig.enabled === true) {
        let Engine = require(`./${engineConfig.name}`),
            engine = new Engine(engineConfig, me.config.get('developmentMode'), me.rollbar);

        me.engines[engineConfig.name] = engine;
      }
    });
  }

  setup() {
    let ps = [];

    _.forEach(this.engines, (engine) => {
      ps.push(engine.setup());
    });

    return PromiseA.all(ps);
  }

  /**
   * Calls the engines to actually do the logging.
   *
   * @param  {String} level - logging level
   * @param  {String} message - message to be logged
   * @param  {Object} data - data to be passed to the engine to be logged and used for message formatting
   */
  apply(level, message, data, req) {
    if (level === this.LEVEL_ERROR || this.enabled === true) {
      _.forEach(this.engines, (engine) => {
        engine.log(level, message, data, req);
      });
    }
  }

  log(message, data) {
    this.apply(this.defaultLevel, message, data);
  }

  info(message, data) {
    this.apply(this.LEVEL_INFO, message, data);
  }

  warn(message, data) {
    this.apply(this.LEVEL_WARN, message, data);
  }

  error(message, data, req) {
    if (req && req.id) {
      data = data || {};
      data.reqId = req.id();
    }

    this.apply(this.LEVEL_ERROR, message, data, req);
  }

  debug(message, data) {
    this.apply(this.LEVEL_DEBUG, message, data);
  }
}

module.exports = Logger;