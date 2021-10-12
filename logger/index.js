'use strict';

import pkg from 'bluebird';
const { all } = pkg;
import Rollbar from 'rollbar';
import Constant from '../constants';
import ConsoleLogger from './console';
import BunyanLogger from './bunyan';

class DummyRollbar {
  error() {}
}

/**
 * Logger abstraction supporting multiple logging engines.
 */
export default class Logger {
  constructor(config) {
    const me = this;

    this.name = 'logger';

    this.LEVEL_INFO = 'info';
    this.LEVEL_WARN = 'warn';
    this.LEVEL_ERROR = 'error';
    this.LEVEL_DEBUG = 'debug';

    this.config = config;
    this.enabled = Constant.loggingEnabled;
    this.defaultLevel = Constant.loggingDefaultLevel;
    this.engines = {};

    // rollbar init
    var rollbarConfig = Constant.rollbar;
    if (rollbarConfig && rollbarConfig.accessToken && !Constant.developmentMode) {
      this.rollbar = new Rollbar({
        accessToken: rollbarConfig.accessToken,
        environment: process.NODE_ENV,
        exitOnUncaughtException: true
      });
    } else {
      this.rollbar = new DummyRollbar();
    }

    Constant.loggingEngines.forEach((engineConfig) => {
      if (engineConfig.enabled === true) {
        if (engineConfig.name === 'console') {
          const engine = new ConsoleLogger(engineConfig, Constant.developmentMode, me.rollbar);
          me.engines[engineConfig.name] = engine;
        } else {
          const engine = new BunyanLogger(engineConfig, Constant.developmentMode, me.rollbar);
          me.engines[engineConfig.name] = engine;
        }
      }
    });
  }

  setup() {
    let ps = [];
    for (const [key, value] of Object.entries(this.engines)) {
      ps.push(value.setup());
    }
    return all(ps);
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
      for (const [key, value] of Object.entries(this.engines)) {
        value.log(level, message, data, req);
      }
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