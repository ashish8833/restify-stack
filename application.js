'use strict';

import { each, resolve } from 'bluebird';
import { create } from './config';
import Logger from './logger';
// import Stats from './lib/stats';
import Database from './database';
import UserManager from './user-manager';

class Application {
  constructor() {
    this.config = create();
    this.logger = new Logger(this.config);
    this.db = new Database(this.config, this.logger);
    this.userManager = new UserManager(this.config, this.logger, this.db);
    // this.subsystems = null;
  }

  async start() {
    const me = this,
          psSetup = [this.logger, this.db],
          psStart = [this.db];

    await each(psSetup, (service) => {
      return service.setup();
    });

    psStart.push(me.newServer());    
  }

  newServer() {
    if (this.config.get('server.enabled') === true) {
      const Server = require('./server');

      return new Server(this.config, this.logger, this.db, this.userManager);
    }

    return resolve();
  }
}

export default Application;
