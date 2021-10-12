'use strict';
import { createPool } from 'slonik';
import pkg from 'bluebird';
const { resolve } = pkg;
import { config } from "dotenv";
config();
class Database {
  constructor(logger) {
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
    console.log(this.slonik);
    return resolve(this);
  }

  start() {
    return resolve(this);
  }
}

export default Database;
