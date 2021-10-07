'use strict';

import Model from './model';
import Controller from './controller';
import { needsRole } from '../../../../middleware/auth';

export function createModel (config, logger, db) { // eslint-disable-line no-unused-vars
  return new Model(config, logger, db);
}

export function createController (config, logger, db) { // eslint-disable-line no-unused-vars
  const model = createModel(config, logger, db);

  return new Controller(config, logger, model);
}

export function create (router, config, logger, db) { // eslint-disable-line no-unused-vars
  const controller = createController(config, logger, db);

  router.get(
    '/auction-lot',
    controller.auctionLot.bind(controller)
  );

  // router.get(
  //     '/admin/auction-lot/dataload/status/:jobId',
  //     needsRole('admin'),
  //     controller.getDataloadStatus.bind(controller)
  // );

  router.get(
    '/admin/auction-lot/:lotId',
    needsRole('admin'),
    controller.getLotById.bind(controller)
  );

  // router.post(
  //   '/admin/auction-lot',
  //   needsRole('admin'),
  //   controller.auctionLotSave.bind(controller)
  //   // _.bind(controller.auctionLotSave, controller)
  // );

  // router.post(
  //   '/auction-lot-map',
  //   _.bind(controller.auctionLotMap, controller)
  // );

  // router.post(
  //   '/auction-lot-list',
  //   _.bind(controller.auctionLotList, controller)
  // );

  // router.get(
  //   '/auction-lot/:auctionLotId/condition-report',
  //   _.bind(controller.getConditionReport, controller)
  // );

  // router.post(
  //   '/auction-lot/:auctionLotId/condition-report',
  //   _.bind(controller.requestConditionReport, controller)
  // );

  return router;
}
