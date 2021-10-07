'use strict';

const _ = require('lodash'),
      PromiseA = require('bluebird'),
      lispParser = require('LISP.js');

/**
 * User management.
 */
class UserManagerDatabaseStore {
  constructor(config, logger, db) {
    this.type = 'db';
    this.config = config;
    this.logger = logger;
    this.db = db;
  }

  setup() {
    this.logger.info('userManager.store[${storeType}].start', { storeType: this.type });

    return PromiseA.resolve();
  }

  serializeUser(user) {
    return user.row_id;
  }

  /**
   * Searches for an user with a given access token.
   *
   * @param  {string} accessToken - the access token to search for.
   * @return {Object|undefined} a user object.
   */
  getUserWithAccessToken(accessToken) {
    return this.db.knex('session')
      .where('access_token', accessToken)
      .andWhere('session.expiration', '>', this.db.knex.fn.now())
      .innerJoin('customer', 'session.customer_id', 'customer.row_id')
      .innerJoin('client_password', 'session.creating_client_id', 'client_password.row_id')
      .first('customer.*', 'session.expiration', 'client_password.permissions')
      .then((customer) => {
        if (customer) {
          customer._kind = 'customer';

          if (!_.isEmpty(customer.permissions)) {
            customer.permissions = lispParser.parse(customer.permissions);
          }
        }

        return customer;
      });
  }

  /**
   * Searches for an user with a given apiKey.
   *
   * @param  {string} apiKey - the api key to search for.
   * @return {Object|undefined} a user object.
   */
  getUserWithAPIKey(apiKey) {
    let user;

    return PromiseA.resolve(user);
  }

  /**
   * Searches for an user with a given username.
   *
   * @param  {string} username - the user name to search for.
   * @param  {string} password - the user password.
   * @return {Object|undefined} a user object.
   */
  getUserWithUsername(username, password) {
    return this.db.knex('client_password')
      .where('client_name', username)
      .where('client_secret', password)
      .first('*')
      .then((client_password) => { // eslint-disable-line am_camelcase
        let user;

        if (client_password && _.isEmpty(client_password.blacklist_reason)) { // eslint-disable-line am_camelcase
          user = {
            _kind: 'client_password',
            row_id: client_password.row_id, // eslint-disable-line am_camelcase
            username: client_password.client_name, // eslint-disable-line am_camelcase
            password: client_password.client_secret, // eslint-disable-line am_camelcase
            platform: client_password.platform, // eslint-disable-line am_camelcase
            tenant_id: client_password.tenant_id, // eslint-disable-line am_camelcase
          };

          if (!_.isEmpty(client_password.permissions)) { // eslint-disable-line am_camelcase
            user.permissions = lispParser.parse(client_password.permissions); // eslint-disable-line am_camelcase
          }
        }

        return user;
      });
  }
}

module.exports = UserManagerDatabaseStore;
