'use strict';

import { InternalServerError } from 'restify-errors';
import { config } from "dotenv";
import {
    createPool,
    sql,
    SlonikError,
    DataIntegrityError
  } from 'slonik';
  config();
/**
 * Connect/Restify custom middleware.
 */
class ConfigMiddleware {

  constructor(logger, db) {
    this.logger = logger;
    this.db = db;
  }

  /**
   * Extra config middleware that loads extended tenant configuration
   */
  extendedConfig(configType) {
    let me = this;
    const {DB_CLIENT, DB_USER, DB_PASSWORD, DB_HOST, DB_PORT, DB_NAME, POOL_SIZE, PORT} = process.env;
    const clientConfiguration = {
        maximumPoolSize: POOL_SIZE,
        preferNativeBindings: true,
        captureStackTrace: false,
    };
    const pool = createPool(`${DB_CLIENT}://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}`, clientConfiguration);
      
    return async function (req, res, next) {
      let err,
          tenantId = req.user && req.user.override_tenant_id || req.user.tenant_id;

      if (!tenantId) {
          me.logger.error('No tenant found for the user');
          err = new InternalServerError('No tenant found for the user');
          return next(err);
      }
      console.log(">> tenantId: ", tenantId)

      const result = await pool.maybeOneFirst(sql`SELECT config_value FROM tenant_extended_config WHERE tenant_id = ${tenantId} AND config_key = ${configType}`);

      if (!result) {
          me.logger.error(`Tenant without configuration for '${configType}'`);
          err = new InternalServerError(`Tenant without configuration for '${configType}'`);
          return next(err);
      }
      req.tenant_extended_config = req.tenant_extended_config || {};
      req.tenant_extended_config[configType] = result; // result value will get config_value from matching one row, no need to set result.config_value
      next();
    };
  }
}

export default ConfigMiddleware;
