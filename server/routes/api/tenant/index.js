'use strict';

import Model from './model';
import Controller from './controller';

export function createModel (config, logger, db) { // eslint-disable-line no-unused-vars
  return new Model(config, logger, db);
}

export function createController (config, logger, db) { // eslint-disable-line no-unused-vars
  const model = createModel(config, logger, db);

  return new Controller(config, logger, model);
}

export function create (router, config, logger, db) { // eslint-disable-line no-unused-vars
  const controller = createController(config, logger, db);

  return router;
}
