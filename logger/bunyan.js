'use strict';

const _ = require('lodash'),
      PromiseA = require('bluebird'),
      bunyan = require('bunyan'),
      path = require('path'),
      mkdirp = PromiseA.promisify(require('mkdirp'));

/**
 * Bunyan logger engine.
 */
class BunyanLogger {
  constructor(config, devMode, rollbar) {
    this.config = config;
    this.devMode = devMode || false;
    this.rollbar = rollbar;
  }

  setup() {
    const me = this;
    let logsFolder = path.dirname(_.get(me.config, 'path'));

    return mkdirp(logsFolder)
      .then(() => {
        me.logger = bunyan.createLogger({
          name: _.get(me.config, 'logName'),
          streams: [{
            type: _.get(me.config, 'type', 'rotating-file'),
            path: _.get(me.config, 'path'),
            period: _.get(me.config, 'period', '1d'),
            count: _.get(me.config, 'count', 3),
          }],
        });
      });
  }

  format(message, data) {
    return message;
  }

  log(level, message, data, req) {
    message = this.format(message, data);
    this.logger[level](data, message);

    // TODO: integrate with rollbar
    // rollbar would be integrated here using the req object
    if (level === 'error' && req && (message.code === undefined || message.code === 500)) {
      this.rollbar.error(message, req);
    }
  }
}

module.exports = BunyanLogger;