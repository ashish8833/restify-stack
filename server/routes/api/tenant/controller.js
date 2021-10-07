'use strict';

import Utils from '../../../../utils';

class Controller {
  constructor(config, logger, model) {
    this.config = config;
    this.logger = logger;
    this.model = model;
  }

  async createPaidLabsAccount(req, res) {
    try {
      const utils = new Utils(this.config, this.logger, this.model.db);
      const tenantId = req.user.override_tenant_id;
      const {currencyId} = req.body;

      // Fetches existing paid accounts or creates new if not exist.
      const paidAccount = await utils.getPaidLabsAccount(tenantId, currencyId);

      res.status(200);
      res.send(paidAccount);
    } catch ( e ) {
      this.logger.error(e);
      res.error(e);
    }
  }
}

export default Controller;
