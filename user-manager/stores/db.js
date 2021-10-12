'use strict';


import pkg from 'bluebird';
const { resolve } = pkg;
import { parse } from 'LISP.js';
import { sql } from 'slonik';

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

    return resolve();
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
    return this.db.slonik.one(sql`SELECT customer.*, session.expiration, client_password.permissions FROM session INNER JOIN
     customer ON session.customer_id = customer.row_id INNER JOIN client_password ON client_password.row_id = session.creating_client_id
     WHERE session.access_token = ${accessToken} AND DATE(session.expiration) > DATE(NOW())`)
      .then((customer) => {
        if (customer) {
          customer._kind = 'customer';

          if (customer.permissions && customer.permissions.length) {
            customer.permissions = parse(customer.permissions);
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
    return this.db.slonik.one(sql`SELECT client_password.* FROM client_password
     WHERE client_password.client_name = ${username} AND client_password.client_secret = ${password}`)
      .then((client_password) => { // eslint-disable-line am_camelcase
        let user;

        if (client_password && !client_password.blacklist_reason) { // eslint-disable-line am_camelcase
          user = {
            _kind: 'client_password',
            permissions: [],
            row_id: client_password.row_id, // eslint-disable-line am_camelcase
            username: client_password.client_name, // eslint-disable-line am_camelcase
            password: client_password.client_secret, // eslint-disable-line am_camelcase
            platform: client_password.platform, // eslint-disable-line am_camelcase
            tenant_id: client_password.tenant_id, // eslint-disable-line am_camelcase
          };
          
          if (client_password.permissions && client_password.permissions.length) { // eslint-disable-line am_camelcase
            user.permissions = parse(client_password.permissions); // eslint-disable-line am_camelcase
          }
        }

        return user;
      });
  }
}

export default UserManagerDatabaseStore;
