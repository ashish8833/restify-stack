'use strict';

const PromiseA = require('bluebird');
const path = require('path');
const Utils = require('../../../../utils');
const libPath = path.resolve(__dirname, '../../../../');
const paginationHelper = require(path.resolve(libPath, 'pagination'));
const moment = require('moment');
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
    let supportedFieldset = [
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
        ],
        badFieldset,
        query = Utils.queryFromRequest(req);

    badFieldset = query.fieldset.filter(x => !supportedFieldset.includes(x));
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

 /**
   * Returns auction lot and auction detail for the tenant.
   *
   * @param  {object} req - request object
   * @param  {object} res - response object
   * @return {Object}
   */
  // auctionLotSave(req, res) {
  //   let body = req.body,
  //     lotData = body,
  //     auction = null,
  //     associatedImagesAuctionLot = body.associated_images,
  //     associatedImagesUrlsAuctionLot = body.associated_images_urls,
  //     associatedImagesAuction,
  //     associatedImagesUrlsAuction;
  //   if (!body.auction_id) {
  //     if (!body.auction || (typeof (body.auction) === 'object' && Array.isArray(body.auction))) {
  //       return res.error({
  //         message: 'auction_id or auction is required.',
  //         class: 'INPUT-ERROR',
  //         code: 400,
  //       });
  //     } else {
  //       associatedImagesAuction = body.auction.associated_images;
  //       associatedImagesUrlsAuction = body.auction.associated_images_urls;

  //       // Setting Validation parameters in joi object
  //       const auctionFieldValidation = Joi.object().keys({
  //         time_start: Joi.date().required(),
  //         title: Joi.string().required(),
  //         description: Joi.string().required(),
  //         time_end: Joi.date().required(),
  //       }).unknown(true); // Unkown true for letting other parameters bypass if passed
  //       // Validating object with request parameters
  //       const result = Joi.validate(body.auction, auctionFieldValidation);
  //       if (result.error != null) {
  //         return res.error({
  //           message: result.error.details[0].message,
  //           class: 'INPUT-ERROR',
  //           code: 400,
  //         });
  //       } else {
  //         auction = body.auction;

  //         if (auction.associated_images) {
  //           delete auction.associated_images;
  //         }
  //         if (auction.associated_images_urls) {
  //           delete auction.associated_images_urls;
  //         }

  //         var auctionStartTime = moment(auction.time_start),
  //           auctionEndTime = moment(auction.time_end),
  //           diff = auctionEndTime.diff(auctionStartTime),
  //           diffDuration = moment.duration(diff);
  //         auction.duration = diffDuration.days() + ' ' + diffDuration.hours() + ':' + diffDuration.minutes() + ':' + diffDuration.seconds();
  //         auction.time_start = moment(auction.time_start).format('YYYY-MM-DD HH:mm:ss');
  //         delete auction.time_end;
  //         auction.tenant_id = req.user.override_tenant_id || req.user.tenant_id;
  //       }
  //     }
  //   } else {
  //     auction = body.auction_id;
  //   }
  //   return this.model.getAuctionForLot(auction).then((auction) => {
  //     if (!auction) {
  //       return res.error({
  //         message: 'auction_id not found',
  //         class: 'INPUT-ERROR',
  //         code: 400,
  //       });
  //     }
  //     return this.validateLotFields(req).then((query) => {
  //       if (lotData.associated_images_urls) {
  //         delete lotData.associated_images_urls;
  //       }
  //       if (lotData.associated_images) {
  //         delete lotData.associated_images;
  //       }
  //       if (lotData.auction) {
  //         delete lotData.auction;
  //       }
  //       lotData.auction_id = auction.row_id;
  //       return this.model.createAuctionLot(lotData, req.user.tenant_id).then((lot) => {
  //         lot.auction = auction.row_id;
  //         if (associatedImagesAuction && associatedImagesAuction.length > 0) {
  //           const auction_row_id = lot.row_id,
  //             // Making images data for bulk insert
  //             imageData = associatedImagesAuction.map((image, index) => {
  //               return {
  //                 auction_id: auction_row_id,
  //                 image_record_id: image.image_id,
  //                 image_index: index,
  //                 caption: image.caption,
  //               };
  //             }),
  //             that = this; // that variable is used to access this in sub function as this is not directly accessible in sub functions
  //           // attaching images to auction
  //           return this.model.attachImagesToAuction(imageData).then(function () {
  //             return auctionLotImageUpload(undefined, that);
  //           });
  //         } else if (associatedImagesUrlsAuction && associatedImagesUrlsAuction.length > 0) {
  //           const auction_row_id = auction.row_id,
  //             // Making async event data for insert
  //             asyncEventData = {
  //               "event_type": 'dataload',
  //               "event_subtype": 'auction_image_upload',
  //               "table_name": 'auction',
  //               "affected_row": auction_row_id,
  //               "extra_data": {
  //                 "auction_id": auction.row_id,
  //                 "tenant_id": auction.tenant_id,
  //                 "images": associatedImagesUrlsAuction,
  //               },
  //             },
  //             that = this; // that variable is used to access this in sub function as this is not directly accessible in sub functions
  //           // Inserting image urls to async event table 
  //           return this.model.addImageUrlsToAsyncJob(asyncEventData).then((result) => {
  //             return auctionLotImageUpload(result.row_id, that);
  //           }).catch((err) => {
  //             console.error(err);
  //             this.logger.error(err);
  //             res.error(err);
  //           });
  //         } else {
  //           const that = this; // that variable is used to access this in sub function as this is not directly accessible in sub functions
  //           return auctionLotImageUpload(undefined, that);
  //         }

  //         function auctionLotImageUpload(auction_job_id, that) {
  //           // If associated_images found for auction
  //           if (associatedImagesAuctionLot && associatedImagesAuctionLot.length > 0) {
  //             if (auction_job_id) {
  //               lot.auctionJobId = auction_job_id;
  //             }
  //             res.send(lot);
  //             const lot_row_id = lot.row_id,
  //               // Making images data for bulk insert
  //               imageData = associatedImagesAuctionLot.map((image, index) => {
  //                 return {
  //                   auction_lot_id: lot_row_id,
  //                   image_record_id: image.image_id,
  //                   image_index: index,
  //                   caption: image.caption,
  //                 };
  //               });
  //             // attaching images to lot
  //             return that.model.attachImagesToLot(imageData);
  //           } else if (associatedImagesUrlsAuctionLot && associatedImagesUrlsAuctionLot.length > 0) { // If associated_images_urls found
  //             if (auction_job_id) {
  //               lot.auctionJobId = auction_job_id;
  //             }
  //             const lot_row_id = lot.row_id,
  //               // Making async event data for insert
  //               asyncEventData = {
  //                 "event_type": 'dataload',
  //                 "event_subtype": 'auctionlot_image_upload',
  //                 "table_name": 'auction_lot',
  //                 "affected_row": lot_row_id,
  //                 "extra_data": {
  //                   "lot_id": lot.row_id,
  //                   "auction_id": auction.row_id,
  //                   "tenant_id": auction.tenant_id,
  //                   "images": associatedImagesUrlsAuctionLot,
  //                 },
  //               };
  //             // Inserting image urls to async event table 
  //             return that.model.addImageUrlsToAsyncJob(asyncEventData).then((result) => {
  //               lot.auctionLotJobId = result.row_id;
  //               return res.send(lot);
  //             }).catch((err) => {
  //               console.error(err);
  //               that.logger.error(err);
  //               return res.error(err);
  //             });
  //           } else {
  //             return res.send(lot);
  //           }
  //         }
  //       });
  //     }).catch((error) => {
  //       console.error(error);
  //       this.logger.error(error);
  //       return res.error({
  //         message: error,
  //         class: 'INPUT-ERROR',
  //         code: 400,
  //       });
  //     });
  //   });
  // }

  /**
   * Returns auction lots for the tenant in the session as an object response.
   *
   * @param  {object} req - request object
   * @param  {object} res - response object
   * @return {Object} -
   */
  // auctionLotMap(req, res) {
  //   return this.validateFields(req, res).then((query) => {
  //     return this.model.auctionLot(query, false, true)
  //       .then((response) => {
  //         res.send(response); // eslint-disable-line am_camelcase
  //       });
  //   }).catch((err) => {
  //     console.error(err);
  //     this.logger.error(err);
  //     res.error(err);
  //   });
  // }

  /**
   * Returns auction lots for the tenant in the session as an Array response.
   *
   * @param  {object} req - request object
   * @param  {object} res - response object
   * @return {Object} -
   */
  auctionLotList(req, res) {
    return this.validateFields(req, res).then((query) => {
      return this.model.auctionLot(query, false, false)
        .then((response) => {
          res.send(response); // eslint-disable-line am_camelcase
        });
    }).catch((err) => {
      console.error(err);
      this.logger.error(err);
      res.error(err);
    });
  }

  /**
   * Returns the condition report for an auction lot
   *
   * @param  {object} req - request object
   * @param  {object} res - response object
   * @return {Object} -
   */
  //getConditionReport(req, res) {
  //   const lotId = req.params.auctionLotId,
  //         tenantId = req.user.tenant_id;

  //   return this.model.getConditionReport(lotId, tenantId, req.user.row_id).then(response => {
  //     res.send(response);
  //   }).catch((err) => {
  //     console.error(err);
  //     this.logger.error(err);
  //     res.error(err);
  //   });
  // }

  /**
   * Requests the condition report information for an auction lot
   *
   * @param  {object} req - request object
   * @param  {object} res - response object
   * @return {Object} -
   */
  // requestConditionReport(req, res) {
  //   const lotId = req.params.auctionLotId,
  //         tenantId = req.user.tenant_id,
  //         body = req.body;

  //   let data = {};

  //   if (!body.name) {
  //     return res.error({
  //       message: "'name' is required",
  //       class: 'INPUT-ERROR',
  //       code: 400,
  //     });
  //   }

  //   if (!body.email) {
  //     return res.error({
  //       message: "'email' is required",
  //       class: 'INPUT-ERROR',
  //       code: 400,
  //     });
  //   }

  //   data.email = body.email;
  //   data.name = body.name;
  //   return this.model.requestConditionReport(lotId, tenantId, data, req.user.row_id)
  //     .then((response) => {
  //       res.statusCode = 201;
  //       res.send(response);
  //     }).catch((err) => {
  //       console.error(err);
  //       this.logger.error(err);
  //       res.error(err);
  //     });
  // }
  /**
   * Requests the dataload status information for an auction lot
   *
   * @param  {object} req - request object
   * @param  {object} res - response object
   * @return {Object} -
   */
  // getDataloadStatus(req, res) {
  //   const jobId = req.params.jobId;
  //   return this.model.checkJobStatus(jobId).then((job) => {
  //     if(!job) {
  //       return res.error({
  //         message: "Job not found",
  //         class: 'INPUT-ERROR',
  //         code: 404,
  //       });
  //     }
  //     res.statusCode = 200;
  //     res.send(job.status);
  //   }).catch((err) => {
  //     console.error(err);
  //     this.logger.error(err);
  //     res.error(err);
  //   });
  // }
}

export default Controller;
