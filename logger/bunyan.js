'use strict';

import get from 'lodash.get';
import PromiseA from 'bluebird';
import { createLogger } from 'bunyan';
import { dirname } from 'path';
import Mkdirp from 'mkdirp';
const mkdirp = PromiseA.promisify(Mkdirp);

/**
 * Bunyan logger engine.
 */
 export default class BunyanLogger {
  constructor(config, devMode, rollbar) {
    this.config = config;
    this.devMode = devMode || false;
    this.rollbar = rollbar;
  }

  async setup() {
    const me = this;
    let logsFolder = dirname(get(me.config, 'path'));

    await mkdirp(logsFolder);
    me.logger = createLogger({
      name: get(me.config, 'logName'),
      streams: [{
        type: get(me.config, 'type', 'rotating-file'),
        path: get(me.config, 'path'),
        period: get(me.config, 'period', '1d'),
        count: get(me.config, 'count', 3),
      }],
    });
  }

  format(message, data) {
    return message;
  }

  log(level, message, data, req) {
    message = this.format(message, data);
    console.log(message);
    this.logger[level](data, message);

    // TODO: integrate with rollbar
    // rollbar would be integrated here using the req object
    if (level === 'error' && req && (message.code === undefined || message.code === 500)) {
      this.rollbar.error(message, req);
    }
  }
}
