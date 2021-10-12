'use strict';

import pkg from 'bluebird';
const {  each } = pkg;
import Logger from './logger';
import Database from './database';
import UserManager from './user-manager';
import Server from './server/index';


export default class Application {
  constructor() {
    this.logger = new Logger();
    this.db = new Database(this.logger);
    this.userManager = new UserManager(this.logger, this.db);

  }

  async start() {
    const me = this;
    const psSetup = [this.logger, this.db];
    const psStart = [this.db];

    await each(psSetup, (service) => {
      console.log("1111", service);
      return service.setup();
    });

    psStart.push(me.newServer());    

    await each(psStart, (service) => {
      console.log("1111", service);
      return service.start(me);
    });
  }

  newServer() {
    console.log("21212121");
    if (process.env.ENABLED) {
      return new Server(this.logger, this.db, this.userManager);
    } 
    return true;
  }
}