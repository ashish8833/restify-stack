'use strict';

import PromiseA from 'bluebird';
import Utils from '../../../../utils';
import paginationHelper from '../../../../pagination';
const Joi = require('joi').default;

/**
* Contoller class which handels all logic functions
*/
class Controller {
  /**
   * Constructor of a class.
   * 
   * @param {Object} config - config object
   * @param {Object} logger - logging functions
   * @param {Object} model - database functions
   */
  constructor(config, logger, model) {
    this.config = config;
    this.logger = logger;
    this.model = model;
  }

  /**
   * Returns Promise or respose.
   *
   * @param {Object} req - request object
   * @param {Object} res - response object
   * @return {Boolean}
   */
  validateFields(req, res) {
    const supportedFieldset = [
      'summary',
      'detail',
      'lot-number',
      'description',
      'timed-auction',
      'reserve-status',
      'live-bid-live-count',
      'live-bid-timed-count',
      'highest-live-bid',
      'absentee-bid',
      'auction.summary',
      'document-repository',
      'youtube',
      'consignor',
      'auction.registration.summary',
      'editorial',
      'highlight-header'
    ];
    const query = Utils.queryFromRequest(req);

    const badFieldset = query.fieldset.filter(x => !supportedFieldset.includes(x));
    if (badFieldset && badFieldset.length > 0) {
      return res.error({
        message: 'Valid values for fieldset are: ' + supportedFieldset.join(', '),
        class: 'INPUT-ERROR',
        code: 400,
      });
    }

    if (query.where.lotIds && query.where.lotIds.length > 50) {
      return res.error({
        message: 'lot_ids max items is 50',
        class: 'INPUT-ERROR',
        code: 400,
      });
    }

    return _resolve(query);
  }

  /**
   * Returns promise with false or true value.
   *
   * @param  {object} req - request object
   * @return {Boolean}
   */
  validateLotFields(req) {
    return new PromiseA(function (resolve, reject) {
      // Setting Validation parameters in joi object
      const auctionLotFieldValidation = Joi.object().keys({
        lot_number: Joi.number().required(),
        title: Joi.string().required(),
        status: Joi.string().required(),
        description: Joi.string().required(),
      }).unknown(true); // Unkown true for letting other parameters bypass if passed

      // Validating object with request parameters
      const result = Joi.validate(req.body, auctionLotFieldValidation);
      if (result.error) {
        return reject(result.error.details[0].message);
      } else {
        return resolve(req);
      }
    });
  }


    /**
     * Returns auction lot detail for the admin in the session as an Array response.
     *
     * @param  {object} req - request object
     * @param  {object} res - response object
     * @return {Object}
     */
    getLotById(req, res) {
      return this.validateFields(req, res).then((query) => {
        let p1;

        query.where.lotId = req.params.lotId;
        p1 = this.model.auctionLotDetail(query);
        return PromiseA.resolve(p1).then((response) => {
          return res.send(response[0]);
        });
      }).catch((err) => {
        this.logger.error(err, {fn: 'getLotById'}, req);
        res.error(err);
      });
    }

  /**
   * Returns auction lots for the tenant in the session as an Array response.
   *
   * @param  {object} req - request object
   * @param  {object} res - response object
   * @return {Object}
   */
  auctionLot(req, res) {
    let fullUrl = paginationHelper.getFullURL(req);

    return this.validateFields(req, res).then((query) => {
      let p1,
          p2;
      p1 = this.model.auctionLot(query, true);
      p2 = this.model.auctionLot(query, false, true, true);
      return PromiseA.join(p1, p2, function (count, response) {
        res.sendPaginated(response, fullUrl, query.offset, query.limit, count);
      });
    }).catch((err) => {
      console.error(err);
      this.logger.error(err);
      res.error(err);
    });
  }
}

export default Controller;
