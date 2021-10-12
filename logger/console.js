'use strict';

import template from 'lodash.template';
import pkg from 'bluebird';
const { resolve } = pkg;
import moment from 'moment';

/**
 * Console logger engine.
 */
export default class ConsoleLogger {
  constructor(config, devMode) {
    this.config = config;
    this.devMode = devMode || false;
  }

  setup() {
    return resolve();
  }

  format(message, data) {
    data.forEach((value, key) => {
      if (typeof value === 'object' || Array.isArray(value)) {
        data[key] = JSON.stringify(value, null, 2);
      }
    });
    return template(message)(data);
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