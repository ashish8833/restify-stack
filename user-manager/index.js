'use strict';

import get from 'lodash.get';
import pick from 'lodash.pick';
import Constant from '../constants';
import UserManagerFSStore from './stores/fs';
import UserManagerDatabaseStore from './stores/db';

/**
 * User management.
 */
class UserManager {
  constructor(logger, db) {
    let storeType = Constant.userManager.store;
    this.logger = logger;
    this.db = db;

    this.stores = {
      fs: UserManagerFSStore,
      db: UserManagerDatabaseStore,
    };

    if (get(this.stores, storeType)) {
      console.log(storeType);
      const Store = this.stores[storeType];
      console.log(Store);
      this.store = new Store(
        Constant.userManager.storeConfig[storeType],
        this.logger,
        this.db
      );
      console.log(this.store);
    } else {
      this.logger.error('userManager.store[${storeType}].error: unknown', { storeType });
      throw new Error(`Unsupported "${storeType}" store type`);
    }
  }

  setup() {
    // FIXME: should we put a cache in front of the user retrieval functions?
    return this.store.setup();
  }

  /**
   * Searches for an user with a given access token.
   *
   * @param  {string} accessToken - the access token to search for.
   * @return {Object|undefined} a user object.
   */
  getUserWithAccessToken(accessToken) {
    return this.store.getUserWithAccessToken(accessToken);
  }

  /**
   * Searches for an user with a given apiKey.
   *
   * @param  {string} apiKey - the api key to search for.
   * @return {Object|undefined} a user object.
   */
  getUserWithAPIKey(apiKey) {
    return this.store.getUserWithAPIKey(apiKey);
  }

  /**
   * Searches for an user with a given username.
   *
   * @param  {string} username - the user name to search for.
   * @param  {string} password - the user password.
   * @return {Object|undefined} a user object.
   */
  getUserWithUsername(username, password) {
    return this.store.getUserWithUsername(username, password);
  }

  /**
   * Login handler
   * @param  {Object} req - connect/express request
   * @param  {Object} res - connect/express response
   */
  login(req, res /* , next */) {
    if (req.user) {
      res.json({ user: pick(req.user, ['username', 'roles']) });
    } else {
      res.error('Not authorized');
    }
  }
}

export default UserManager;
