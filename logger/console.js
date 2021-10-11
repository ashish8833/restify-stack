'use strict';

const _ = require('lodash'),
      PromiseA = require('bluebird'),
      moment = require('moment');

/**
 * Console logger engine.
 */
class ConsoleLogger {
  constructor(config, devMode) {
    this.config = config;
    this.devMode = devMode || false;
  }

  setup() {
    return PromiseA.resolve();
  }

  format(message, data) {
    _.forEach(data, (value, key) => {
      if (_.isObject(value) || _.isArray(value)) {
        data[key] = JSON.stringify(value, null, 2);
      }
    });
    return _.template(message)(data);
  }

  log(level, message, data) {
    let timestamp = '';

    // we only use this on development mode
    if (!this.devMode) {
      return;
    }

    if (this.config.timestamp === true) {
      timestamp += moment().toISOString();
    }

    if (level === 'error') {
      console.log(`[${timestamp}][${level}] ${message}`, data);
    } else {
      console.log(`[${timestamp}][${level}]`, this.format(message, data));
    }
  }
}

module.exports = ConsoleLogger;