'use strict';

const _ = require('lodash');

/**
 * User management.
 */
class UserManager {
  constructor(config, logger, db) {
    let storeType = config.get('userManager.store');

    this.config = config;
    this.logger = logger;
    this.db = db;

    this.stores = {
      fs: require('./stores/fs'),
      db: require('./stores/db'),
    };

    if (_.get(this.stores, storeType)) {
      let Store = this.stores[storeType];

      this.store = new Store(
        this.config.get(`userManager.storeConfig.${storeType}`),
        this.logger,
        this.db
      );
    } else {
      this.logger.error('userManager.store[${storeType}].error: unknown', { storeType: storeType });
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
      res.json({ user: _.pick(req.user, ['username', 'roles']) });
    } else {
      res.error('Not authorized');
    }
  }
}

module.exports = UserManager;
