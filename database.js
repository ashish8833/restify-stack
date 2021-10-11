'use strict';
import { createPool } from 'slonik';
import { resolve } from 'bluebird';
import { config } from "dotenv";
config();
class Database {
  constructor(config, logger) {
    this.config = config;
    this.logger = logger;
    this.slonik = null;
  }

  setup() {
    const {DB_CLIENT, DB_USER, DB_PASSWORD, DB_HOST, DB_PORT, DB_NAME, POOL_SIZE, PORT} = process.env;
    const clientConfiguration = {
        maximumPoolSize: POOL_SIZE,
        preferNativeBindings: true,
        captureStackTrace: false,
    };
    this.slonik = createPool(`${DB_CLIENT}://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}`, clientConfiguration);

    return resolve(this);
  }

  start() {
    return resolve(this);
  }
}

export default Database;
