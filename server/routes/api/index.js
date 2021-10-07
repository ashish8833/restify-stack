'use strict';

import { Router as _Router } from 'restify-router';

export function create (config, logger, db) { // eslint-disable-line no-unused-vars
  const router = new _Router();

  require('./auction-lot').create(router, config, logger, db);
  require('./auction').create(router, config, logger, db);
  require('./tenant').create(router, config, logger, db);

  return router;
}