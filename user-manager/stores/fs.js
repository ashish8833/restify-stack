'use strict';

import { promisifyAll, resolve } from 'bluebird';
const fs = promisifyAll(require('fs-extra'));

/**
 * User management.
 */
class UserManagerFSStore {
  constructor(config, logger) {
    this.type = 'fs';
    this.config = config;
    this.logger = logger;
    this.users = [];
  }

  setup() {
    const me = this;

    this.logger.info('userManager.store[${storeType}].start', { storeType: this.type });

    return fs.readFileSync(this.config.get('path'))
      .then((data) => {
        let users = JSON.parse(data);

        if (users.enabled === true) {
          me.users = users.users;
        }
      });
  }

  serializeUser(user) {
    return user.username;
  }

  /**
   * Searches for an user with a given access token.
   *
   * @param  {string} accessToken - the access token to search for.
   * @return {Object|undefined} a user object.
   */
  getUserWithAccessToken(accessToken) {
    var user;

    this.users.forEach((u) => {
      if (typeof u.accessToken === 'string' && u.accessToken === accessToken) {
        user = u;
        return false;
      }
    });

    return resolve(user);
  }

  /**
   * Searches for an user with a given apiKey.
   *
   * @param  {string} apiKey - the api key to search for.
   * @return {Object|undefined} a user object.
   */
  getUserWithAPIKey(apiKey) {
    var user;

    this.users.forEach((u) => {
      if (typeof u.apiKey === 'string' && u.apiKey === apiKey) {
        user = u;
        return false;
      }
    });

    return resolve(user);
  }

  /**
   * Searches for an user with a given username.
   *
   * @param  {string} username - the user name to search for.
   * @param  {string} password - the user password.
   * @return {Object|undefined} a user object.
   */
  getUserWithUsername(username, password) {
    var user;

    this.users.forEach((u) => {
      if (typeof u.username === 'string' && u.username === username && u.password === password) {
        user = u;
        return false;
      }
    });

    return resolve(user);
  }
}

export default UserManagerFSStore;
