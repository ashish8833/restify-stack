'use strict';

import PromiseA from 'bluebird';
import SharedModels from '../../../../models';
const sharedModels = SharedModels.create();
import modelsHelper from '../../../../models/helper';
import AuthMiddleware from '../../../../middleware/auth';

class Model {
  constructor(config, logger, db) {
    this.config = config;
    this.logger = logger;
    this.db = db;
  }

  getOrderBy(field, ord) {
    let mapOrderBy = {
          'artist_name': 'auction_lot.artist',
          'title': 'auction_lot.title',
          'extended_end_time': 'auction_lot.extended_end_time',
          'most_recent_change': 'winning_bid.updated_at',
          'current_bid': 'winning_bid.amount',
        },
        orderClause;

    switch (field) {
    case 'lot_number':
      if (ord === 'desc') {
        orderClause = 'auction_lot.lot_number DESC, auction_lot.lot_number_extension DESC';
      } else {
        orderClause = 'auction_lot.lot_number ASC, auction_lot.lot_number_extension ASC';
      }
      break;
    default:
      orderClause = mapOrderBy[field] || field;
      orderClause = orderClause +' '+ord;
      break;
    }

    return orderClause;
  }

  mapResponse(results) {
    let toReturn = {};

    results.forEach((lot) => {
      toReturn[lot.row_id] = lot;
    });

    return toReturn;
  }

  /**
   * 
   * @param {Object} auctionLotIds
   * @returns mapped Images based on lotIds 
   */
  getAuctionLotImages(auctionLotIds) {
    let self = this,
        query;
    query = this.db.knex('auction_lot_image')
      .select(self.db.knex.raw('image_url(?, image_record_id) as thumbnail_url', [this.config.get('imageBaseUrl').replace(/\/?$/, '/')]), 'image_record_id as row_id', 'caption', 'auction_lot_id')
      .whereIn('auction_lot_id', auctionLotIds)
      .orderBy('image_index', 'asc');

    return query.then((lot_images) => {
      return lot_images.reduce((result, lot_image) => {
        lot_image.detail_url = lot_image.thumbnail_url;
        const images = result[lot_image.auction_lot_id] || [];
        images.push(lot_image);
        result[lot_image.auction_lot_id] = images;
        return result;  
       }, {})
      });
  }

  extractWinningBid(row, query, check) {
    let winningBid = null,
        customer,
        userId = query.where.asUserId;

    winningBid = modelsHelper.mapColumnsToObject(row, 'winning_bid');

    if (winningBid) {
      winningBid.registration = modelsHelper.mapColumnsToObject(row, 'winning_registration');

      if (winningBid.registration) {
        customer = modelsHelper.mapColumnsToObject(row, 'winning_customer');
        customer.role = sharedModels.customer.getCustomerRole(customer);
        customer.name = sharedModels.customer.getCustomerName(customer);
        winningBid.registration.customer = customer;
      }
    }

    if (winningBid
      && winningBid.registration
      && winningBid.registration.customer
      && userId === winningBid.registration.customer.customer_id
      && check !== true) {
      return null;
    }

    return winningBid;
  }


  extractCategories(lotIds, lots, query) {
    let queryP = PromiseA.resolve(lots);
    queryP = this.db.knex('auction_lot_category')
      .select('category.*', 'auction_lot_category.auction_lot_id')
      .whereIn('auction_lot_id', lotIds)
      .rightJoin('category', 'category.row_id', 'auction_lot_category.category_id')
      .then((results) => {
        lots.forEach((lot) => {
          let liveData = results.filter((e) => e.auction_lot_id === lot.row_id);
          lot.categories = (liveData.length)? liveData: [];
        });
        return lots;
      });
    return queryP;
  }

  extractFieldsetInfo(row, query) {
    let entry = {},
        fieldset = query.fieldset;

    entry = modelsHelper.mapColumnsToObject(row, 'auction_lot');
    entry = entry || {};

    // TODO: make a simple check method for multiple fieldsets
    if (fieldset.includes('auction.summary') || fieldset.includes('detail')  || fieldset.includes('summary') ) {
      entry.auction = modelsHelper.mapColumnsToObject(row, 'auction');
      entry.consignor = modelsHelper.mapColumnsToObject(row, 'consignor');
      entry.auction.currency_code = row['currency-currency_code'];
      entry.auction.type = 'auction-summary';
      entry.auction.self_url = this.config.get('serverBaseUrl')+'v1/artist/'+entry.row_id+'/summary';
      entry.auction.detail_url = this.config.get('serverBaseUrl')+'v1/artist/'+entry.row_id;
      entry.auction.lot_url = this.config.get('serverBaseUrl')+'v1/artist/'+entry.row_id+'/lots';
      entry.auction.effective_end_time = row['effective_end_time'];
      entry.auction.cover_thumbnail = row['auction_image_cover_thumbnail'];
      if (typeof row['auction-xattrs'] === 'object' && row['auction-xattrs'].bidTable) {
        entry.auction.bidTable = row['auction-xattrs'].bidTable;
      }
      delete entry.auction.xattrs;
      // FIXME - auction lot api getting heavy operation due to so many database call
      entry.auction.lot_count = 0;
      entry.auction.active_lot_count = 0;
      entry.auction.sold_lot_count = 0;
      entry.auction.total_sold_value = 0;
      entry.auction.total_hammer_price = 0;
    }

    fieldset.includes('live-bid-live-count') 
    if (fieldset.includes('live-bid-timed-count') ) {
      entry.liveBidTimedCount = row['live_bid-timed_count'];
    }

    if (fieldset.includes('live-bid-live-count')) {
      entry.liveBidLiveCount = row['live_bid-live_count'];
    }

    if (fieldset.includes('reserve-status') && AuthMiddleware.hasPermission(query.user, ':publish-reserve-status')) {
      entry.reserveMet = row['auction_lot-reserve_price'] ? parseFloat(row['winning_bid-amount'] || row['auction_lot-sold_price'] || 0) >= parseFloat(row['auction_lot-reserve_price']) : null;
    }

    if (query.where.asUserId && (fieldset.includes('detail') || fieldset.includes('timed-auction'))) {
      let artistRecord=[],
          records = modelsHelper.mapColumnsToObject(row, 'artist_records');
      if (records) {
        records.self_url = this.config.get('serverBaseUrl')+'v1/artist/'+records.row_id+'/summary';
        records.detail_url = this.config.get('serverBaseUrl')+'v1/artist/'+records.row_id;
        records.watch_url = this.config.get('serverBaseUrl')+'v1/artist/'+records.row_id+'/watch';
        let watchedArtist = modelsHelper.mapColumnsToObject(row, 'watched_artist');
        records.is_watched=watchedArtist ? true : false;
        records.cover_thumbnail = row ['artist_image_cover_thumbnail'];
        records.type = 'artist-summary';
        artistRecord.push(records);
      }
      entry.artistRecords = artistRecord;

      // FIXME - auction lot api getting heavy operation due to so many database call 
      entry.document_repository = null;
      entry.bottle_sizes = null;

      if (query.where.asUserId) {
        let watchedLot = modelsHelper.mapColumnsToObject(row, 'watched_lot');
        entry.is_watched = watchedLot ? true : false;
      }
      let auctionLotGroupRecord =[],
          auction_lot_records=modelsHelper.mapColumnsToObject(row, 'auction_lot_group');
      if (auction_lot_records) {
        auctionLotGroupRecord.push(auction_lot_records);
      }
      entry.auctionLotGroup=auctionLotGroupRecord;
      entry.winningBid = this.extractWinningBid(row, query, true);
      // FIXME - auction lot api getting heavy operation due to so many database call 
      entry.images = null;
      entry.cover_thumbnail = null;
      entry.type='auction-lot-detail';
      entry.summary_url = this.config.get('serverBaseUrl')+'v1/artist/'+entry.row_id+'/summary';
      entry.self_url = this.config.get('serverBaseUrl')+'v1/artist/'+entry.row_id;
      entry.watch_url = this.config.get('serverBaseUrl')+'v1/auction-lot/'+entry.row_id+'/watch';
    }

    if (fieldset.includes('timed-auction')) {
      entry.timedAuctionBid = this.extractWinningBid(row, query);
    }

    if (fieldset.includes('absentee-bid') && query.where.asUserId) {
      entry.absenteeBid = modelsHelper.mapColumnsToObject(row, 'ab');
    }
    return entry;
  }

  selectColumnsByFieldset(query, isCountQuery) {
    let selectColumns = ['auction_lot.row_id AS auction_lot-row_id', 'auction_lot.title_secondary AS auction_lot-title_secondary','auction_lot.title_tertiary AS auction_lot-title_tertiary'],
        fieldset = query.fieldset,
        isAdmin = query.isAdmin || false;

    if (isCountQuery === true) {
      return [];
    }

    if (fieldset.includes('summary')) {
      selectColumns = selectColumns.concat(sharedModels.auctionLot.summaryColumns());
    }

    if (fieldset.includes('auction.summary') || fieldset.includes('summary')) {
      selectColumns = selectColumns.concat(sharedModels.auction.summaryColumns('auction', ['xattrs']));
    }

    if (fieldset.includes('auction.summary') || fieldset.includes('summary') || fieldset.includes('detail')) {
      selectColumns = selectColumns.concat(modelsHelper.mapColumn('currency', 'currency_code'));
    }

    if (fieldset.includes('detail')) {
      selectColumns = selectColumns.concat(sharedModels.auction.detailColumns('auction', ['xattrs']));
    }

    if (fieldset.includes('lot-number')) {
      selectColumns = selectColumns.concat(sharedModels.auctionLot.lotNumberColumns());
    }

    if (fieldset.includes('reserve-status') && AuthMiddleware.hasPermission(query.user, 'publish-reserve-status')) {
      selectColumns = selectColumns.concat(modelsHelper.mapColumn('auction_lot', 'reserve_price'));
      selectColumns = selectColumns.concat(modelsHelper.mapColumn('auction_lot', 'sold_price'));
      selectColumns = selectColumns.concat(modelsHelper.mapColumn('winning_bid', 'amount'));
    }

    if (fieldset.includes('description')) {
      selectColumns = selectColumns.concat(modelsHelper.mapColumn('auction_lot', 'description'));
    }

    if (fieldset.includes('editorial')) {
      selectColumns = selectColumns.concat(modelsHelper.mapColumn('auction_lot', 'editorial_summary'));
      selectColumns = selectColumns.concat(modelsHelper.mapColumn('auction_lot', 'editorial_external_url'));
    }

    if (fieldset.includes('highlight-header')) {
      selectColumns = selectColumns.concat(modelsHelper.mapColumn('auction_lot', 'highlight'));
      selectColumns = selectColumns.concat(modelsHelper.mapColumn('auction_lot', 'highlight_header'));
    }

    if (fieldset.includes('detail') || fieldset.includes('timed-auction')) {
      selectColumns = selectColumns.concat(sharedModels.auctionLot.detailColumns());
      selectColumns = selectColumns.concat(sharedModels.artist.summaryColumns('artist_records', isAdmin));
      selectColumns = selectColumns.concat(sharedModels.consignor.summaryColumns('consignor'));
      if (query.where.asUserId) {
        selectColumns = selectColumns.concat(sharedModels.watchedArtist.summaryColumns('watched_artist'));
        selectColumns = selectColumns.concat(sharedModels.watchedLot.summaryColumns('watched_lot'));
      }
      selectColumns = selectColumns.concat(sharedModels.auctionLotGroup.summaryColumns('auction_lot_group', isAdmin));
      selectColumns = selectColumns.concat(sharedModels.liveBid.summaryColumns('winning_bid', isAdmin));
      selectColumns = selectColumns.concat(sharedModels.auctionRegistration.summaryColumns('winning_registration', isAdmin));
      selectColumns = selectColumns.concat(sharedModels.customer.summaryColumns('winning_customer', isAdmin));
    }

    if (fieldset.includes('absentee-bid') && query.where.asUserId) {
      selectColumns = selectColumns.concat(sharedModels.absenteeBid.summaryColumns('ab', isAdmin));
    }

    return selectColumns;
  }

  joinStatements(query, isCountQuery) {
    let joinStatements = [],
        fieldset = query.fieldset;

    if (fieldset.includes('auction.summary') || fieldset.includes('summary') || fieldset.includes('detail')) {
      joinStatements.push('INNER JOIN auction ON auction_lot.auction_id = auction.row_id');
      joinStatements.push('INNER JOIN currency ON auction.currency_id = currency.row_id');
    }

    if (query.where.asUserId && query.isAdmin === false) {
      joinStatements.push(this.db.knex.raw('LEFT JOIN auction_registration AS UAR ON (auction_lot.auction_id = UAR.auction_id AND UAR.customer_id = ?)', query.where.asUserId));
      joinStatements.push('LEFT JOIN live_bid AS ULB ON (auction_lot.winning_bid_id = ULB.row_id AND UAR.row_id = ULB.registration_id)');
    }

    if (isCountQuery === true) {
      return joinStatements;
    }

    if (fieldset.includes('reserve-status') || fieldset.includes('detail') ||fieldset.includes('timed-auction')) {
      joinStatements.push('LEFT JOIN live_bid AS winning_bid ON auction_lot.winning_bid_id = winning_bid.row_id');
      joinStatements.push('LEFT JOIN auction_registration AS winning_registration ON winning_bid.registration_id = winning_registration.row_id');
      joinStatements.push('LEFT JOIN customer AS winning_customer ON winning_registration.customer_id = winning_customer.row_id');
      joinStatements.push('LEFT JOIN artist AS artist_records ON artist_records.row_id = auction_lot.artist_id');
      joinStatements.push('LEFT JOIN consignor AS consignor ON consignor.row_id = auction_lot.consignor_id');
      joinStatements.push('LEFT JOIN artist_image AS artist_image ON artist_image.artist_id = auction_lot.artist_id');
      joinStatements.push('LEFT JOIN auction_lot_group ON auction_lot_group.row_id = auction_lot.auction_lot_group_id');
    }

    if (query.where.asUserId) {
      joinStatements.push(this.db.knex.raw('LEFT JOIN watched_artist AS watched_artist ON (watched_artist.artist_id = auction_lot.artist_id AND watched_artist.customer_id = ?)', query.where.asUserId));
      joinStatements.push(this.db.knex.raw('LEFT JOIN watched_lot AS watched_lot ON (watched_lot.auction_lot_id =auction_lot.row_id  AND watched_lot.customer_id = ?)',  query.where.asUserId));
    }

    if (fieldset.includes('absentee-bid') && query.where.asUserId) {
      joinStatements.push(this.db.knex.raw('LEFT JOIN auction_registration AS ab_auction_reg ON (ab_auction_reg.auction_id = auction_lot.auction_id AND ab_auction_reg.customer_id = ?)', query.where.asUserId));
      joinStatements.push('LEFT JOIN absentee_bid AS ab ON (ab.lot_id = auction_lot.row_id AND ab.registration_id = ab_auction_reg.row_id AND (NOT ab.cancelled))');
    }

    return joinStatements;
  }

  extraQueryDataAmounts(lotIds, lots, query) {
    let queryP = PromiseA.resolve(lots),
        fieldset = query.fieldset;

    if (fieldset.includes('live-bid-timed-count') || fieldset.includes('live-bid-live-count')) {
      queryP = this.db.knex('live_bid')
        .select('type', 'auction_lot_id')
        .count('*').as('count')
        .whereIn('auction_lot_id', lotIds)
        .where('cancelled', false)
        .groupBy('auction_lot_id', 'type')
        .then((results) => {
          lots.forEach((lot) => {
            if (fieldset.includes('live-bid-timed-count')) {
              let timedData = results.filter((e) => e.type === 'timed' && e.auction_lot_id === lot.row_id );
              lot.liveBidTimedCount = timedData[0] && parseInt(timedData[0].count) || 0;
            }

            if (fieldset.includes('live-bid-live-count')) {
              let liveData = results.filter((e) => e.type === 'live' && e.auction_lot_id === lot.row_id );
              lot.liveBidLiveCount = liveData[0] && parseInt(liveData[0].count) || 0;
            }
          });

          return lots;
        });
    }

    return queryP;
  }

  extraQueryDataHighestLiveBid(lotIds, lots, query) {
    let queryP = PromiseA.resolve(lots),
        fieldset = query.fieldset;
    if (fieldset.includes('highest-live-bid') && query.where.asUserId) {
      queryP = this.db.knex('live_bid')
        .select(this.db.knex.raw('distinct on (live_bid.auction_lot_id) live_bid.amount, live_bid.row_id, live_bid.registration_id, live_bid.auction_lot_id'))
        .leftJoin('auction_registration', 'live_bid.registration_id', 'auction_registration.row_id')
        .whereIn('auction_lot_id', lotIds)
        .where('auction_registration.customer_id', query.where.asUserId)
        .where('cancelled', false)
        .where('rejected', false)
        .orderByRaw(this.db.knex.raw('auction_lot_id, amount desc'))
        .then((results) => {
          let mapResults = {};

          results.forEach((result) => {
            mapResults[result.auction_lot_id] = result;
          });

          lots.forEach((lot) => {
            lot.highestLiveBid = mapResults[lot.row_id] || null;
          });

          return lots;
        });
    }

    return queryP;
  }

  extraQueryDataHighestAbsenteeBid(lotIds, lots, query) {
    let queryP = PromiseA.resolve(lots),
        fieldset = query.fieldset,
        isAdmin = query.isAdmin;
        fieldset.includes('summary')
    if (isAdmin === true && (fieldset.includes('summary') || fieldset.includes('detail'))) {
      queryP = this.db.knex('absentee_bid')
        .select(this.db.knex.raw('distinct on (lot_id) max_bid, row_id, registration_id, lot_id, group_id, confirmed, type'))
        .whereIn('lot_id', lotIds)
        .where('confirmed', true)
        .where('cancelled', false)
        .orderByRaw(this.db.knex.raw('lot_id, max_bid desc'))
        .then((results) => {
          let mapResults = {};

          results.forEach((result) => {
            mapResults[result.lot_id] = result;
          });

          lots.forEach((lot) => {
            lot.highestAbsenteeBid = mapResults[lot.row_id] || null;
          });

          return lots;
        });
    }

    return queryP;
  }

  extraQueryData(lotIds, lots, query) {
    return this.extraQueryDataAmounts(lotIds, lots, query)
      .then((lots) => {
        return this.extraQueryDataHighestLiveBid(lotIds, lots, query);
      }).then((lots) => {
        return this.extraQueryDataHighestAbsenteeBid(lotIds, lots, query);
      });
  }

  auctionLot(query, isCountQuery, mapResponse, sortResults, limitResults) {
    let self = this,
        selectColumns = ['title_secondary', 'title_tertiary'],
        orderStatements = [],
        whereStatements = [],
        hideLotWhereStatement = [],
        joinStatements = [],
        kQuery,
        orderBy,
        order,
        statusBlackList = ['withdrawn', 'draft'];

    sortResults = sortResults || false;
    limitResults = limitResults || false;

    if (sortResults) {
      orderBy = query.order_by || ['lot_number'];
      order = query.order || ['ASC'];
    }

    joinStatements = self.joinStatements(query, isCountQuery);
    selectColumns = [...new Set(self.selectColumnsByFieldset(query, isCountQuery))];

    kQuery = self.db.knex('auction_lot')
      .select(
      selectColumns
      )
      .where('auction_lot.tenant_id', query.where.tenantId)
      .where(self.db.knex.raw(whereStatements.join(' AND '))) // TODO: make this also available for OR
      .whereNotIn('auction_lot.status', statusBlackList)
      .joinRaw(self.db.knex.raw(joinStatements.join(' ')));

    if (query.isAdmin === false) {
      hideLotWhereStatement.push("(auction_lot.visibility = 'all' OR auction_lot.visibility is null)");

      if (query.where.asUserId) {
        hideLotWhereStatement.push("(auction_lot.visibility = 'winner_only' AND auction_lot.status <> 'sold')");
        hideLotWhereStatement.push("(auction_lot.visibility = 'winner_only' AND auction_lot.status = 'sold' AND ULB.row_id IS NOT NULL)");
      }
    }

    if (hideLotWhereStatement) {
      kQuery.andWhere(function() {
        this.where(self.db.knex.raw(hideLotWhereStatement.join(' OR ')));
      });
    }

    if (query.where.lotIds) {
      kQuery.whereIn('auction_lot.row_id', query.where.lotIds);
    }

    if (query.where.auctionId) {
      kQuery.where('auction_lot.auction_id', query.where.auctionId);
    }

    if (isCountQuery) {
      kQuery = self.db.knex.count('*').from(kQuery.as('result_set'));
    } else {
      if (sortResults) {
        orderBy.forEach((field, index) => {
          let ord,
              orderClause;

          ord = orderBy.length === order.length ? order[index] : order[0];
          orderClause = self.getOrderBy(field, ord);
          orderStatements.push(orderClause);
        });
        kQuery.orderByRaw(self.db.knex.raw(orderStatements.join(', ')));
      }

      if (limitResults) {
        kQuery.limit(query.limit).offset(query.offset);
      }
    }

    return kQuery
      .then((lotResults) => {
        let toReturn = [],
            lotIds = [];

        if (isCountQuery) {
          return parseInt(lotResults[0].count, 10);
        }
        lotResults.forEach((row) => {
          lotIds.push(row['auction_lot-row_id']);
          toReturn.push(self.extractFieldsetInfo(row, query));
        });

        return self.extraQueryData(lotIds, toReturn, query);
      }).then((toReturn) => {
        fieldset.includes('reserve-status')
        if(fieldset.includes('reserve-status')
          || fieldset.includes('detail')
          || fieldset.includes('timed-auction')) {

          const auction_lot_ids = toReturn.map(auction_lot => auction_lot['row_id']);
        
          return self.getAuctionLotImages(auction_lot_ids)
            .then(auction_lot_images_map => {
              toReturn.forEach(auction_lot => {
                const images = auction_lot_images_map[auction_lot['row_id']] || [];
                auction_lot['images'] = images;
                auction_lot['cover_thumbnail'] = (images[0]) ? images[0].thumbnail_url : null;
              });
              return toReturn;
            });
        }

        return toReturn;
      }).then((response) => {
        if (mapResponse === true) {
          return self.mapResponse(response);
        }

        return response;
      });
  }

  auctionLotDetail(query) {

    let self = this,
        selectColumns = [],
        whereStatements = [],
        joinStatements = [],
        kQuery,
        statusBlackList = ['withdrawn', 'draft'];

    joinStatements = self.joinStatements(query, false);
    selectColumns = [...new Set(self.selectColumnsByFieldset(query, false))];
    
    if (query.fieldset.includes('detail')){
      selectColumns.push(this.db.knex.raw("(auction.duration+auction.time_start) as effective_end_time"));
      selectColumns.push(this.db.knex.raw('image_url(?, artist_image.image_record_id) as artist_image_cover_thumbnail', [this.config.get('imageBaseUrl').replace(/\/?$/, '/')]));
    }
    kQuery = self.db.knex('auction_lot')
      .select(
        selectColumns
      )
      .where('auction_lot.tenant_id', query.where.tenantId)
      .where(self.db.knex.raw(whereStatements.join(' AND '))) // TODO: make this also available for OR
      .whereNotIn('auction_lot.status', statusBlackList)
      .joinRaw(self.db.knex.raw(joinStatements.join(' ')));

    if (query.where.lotId) {
      kQuery.where('auction_lot.row_id', query.where.lotId);
    }

    if (query.where.auctionId) {
      kQuery.where('auction_lot.auction_id', query.where.auctionId);
    }
    return kQuery
      .then((lotResults) => {
        let toReturn = [],
            lotIds = [];
        lotResults.forEach((row) => {
          lotIds.push(row['auction_lot-row_id'])
          toReturn.push(self.extractFieldsetInfo(row, query));
        });
        this.extraQueryDataHighestAbsenteeBid(lotIds, toReturn, query).then((lots) => {
          toReturn=lots;
        });
        return self.extractCategories(lotIds, toReturn, query);
      }).then((toReturn) => {
        if (query.fieldset.includes('detail') || toReturn.length > 0) {
          return self.getLotImages(toReturn[0]['row_id']).then((images) => {
            toReturn[0]['images'] = images;
            toReturn[0]['cover_thumbnail'] = (images[0]) ? images[0].thumbnail_url : null;
            return toReturn;
          });
        }

        return toReturn;
      });
  }

  getAuctionLot(lotId, tenantId, auctionId) {
    let query;
    query = this.db.knex('auction_lot')
      .where('row_id', lotId)
      .where('tenant_id', tenantId);

    if (auctionId) {
      query.where('auction_id', auctionId);
    }

    return query.then((lots) => {
      return lots[0] || null;
    });
  }

  getCustomer(customerId, tenantId) {
    let query;

    query = this.db.knex('customer')
      .where('row_id', customerId)
      .where('tenant_id', tenantId);

    return query.then((customers) => {
      return customers[0] || null;
    });
  }

  getConditionReport(lotId, tenantId, userId) {
    return this.getAuctionLot(lotId, tenantId).then((lot) => {
      let user = {};

      if (!lot) {
        return PromiseA.rejected({
          message: 'The auction lot does not exist',
          class: 'RESOURCE-NOT-FOUND',
          code: 404
        });
      }

      return this.getCustomer(userId, tenantId).then((customer) => {
        if (customer) {
          user.integration_id = customer.integration_id;
          user.name = customer.given_name +' '+ customer.family_name;
        }

        return this.db.knex('asynch_events').insert({
          event_type: 'webhook',
          event_subtype: 'condition_report',
          extra_data: {
            auction_lot_id: lotId,
            tenant_id: tenantId,
            customer: user,
            type: 'access',
          },
        }).then((_job) => {
          return PromiseA.resolve({condition_report: lot.condition_report});
        });
      });
    });
  }

  requestConditionReport(lotId, tenantId, data, userId) {
    return this.getAuctionLot(lotId, tenantId).then((lot) => {
      let user = {};

      if (!lot) {
        return PromiseA.rejected({
          message: 'The auction lot does not exist',
          class: 'RESOURCE-NOT-FOUND',
          code: 404
        });
      }

      return this.getCustomer(userId, tenantId).then((customer) => {
        if (customer) {
          user.integration_id = customer.integration_id;
          user.name = customer.given_name +' '+ customer.family_name;
        }

        return this.db.knex('asynch_events').insert({
          event_type: 'webhook',
          event_subtype: 'condition_report',
          extra_data: {
            auction_lot_id: lotId,
            tenant_id: tenantId,
            data: data,
            customer: user,
            type: 'request',
          },
        }).then((_job) => {
          return PromiseA.resolve({});
        });
      });
    });
  }

  getAuctionForLot(auction) {
    let self = this,
        query;
    if (typeof auction !== 'object' || Array.isArray(auction)) {
      query = self.db.knex('auction')
        .where('row_id', auction);

      return query.then((auctions) => {
        return auctions[0] || null;
      });
    } else {
      return this.createAuction(auction);
    }
  }

  createAuction(data) {
    let self = this,
        auction;
    // TODO: Validate data
    return self.db.knex('auction').insert(data).returning('*').then((_auction) => {
      auction = _auction[0] || null;
      return auction;
    });
  }

  createAuctionLot(data, tenantId) {
    let self = this,
        lot;
    // TODO: Validate data

    if (data.artist) {
      return this.getOrInsertArtist(data.artist, tenantId).then((_artist) => {
        data.artist_id = _artist.row_id;
        return self.db.knex('auction_lot').insert(data).returning('*').then((_lot) => {
          lot = _lot[0] || null;
          return lot;
        });
      });
    } else {
      return self.db.knex('auction_lot').insert(data).returning('*').then((_lot) => {
        lot = _lot[0] || null;
        return lot;
      });
    }
  }

  checkJobStatus(jobId) {
    let self = this,
        job;
    return self.db.knex('asynch_events')
      .where('row_id', jobId)
      .where('event_type', 'dataload')
      .where('event_subtype', 'auctionlot_image_upload')
      .then((_jobs) => {
        job = _jobs[0] || null;
        return job;
      });
  }

  /**
   * Returns inserted rows response
   *
   * @param  {Array} data
   * @return {Array}
   */
  attachImagesToAuction(data) {
    let self = this;
    return self.db.knex('auction_image').insert(data).returning('*').then((auctionImages) => auctionImages);
  }

  /**
   * Returns inserted rows response
   *
   * @param  {Array} data
   * @return {Array}
   */
  attachImagesToLot(data) {
    let self = this;
    return self.db.knex('auction_lot_image').insert(data).returning('*').then((lotImages) => lotImages);
  }
  /**
   * Returns inserted event response
   *
   * @param  {Object} data
   * @return {Object}
   */
  addImageUrlsToAsyncJob(data) {
    return this.db.knex('asynch_events').insert(data).returning('*').then((eventData) => {
      return PromiseA.resolve(eventData[0]);
    });
  }


  /**
   * Returns Boolean of getBottleSizes  response
   *
   * @param  {String} lotId
   * @return {Array}
   */
  getBottleSizes(lotId) {
    let query;
    query = this.db.knex('auction_lot_bottle_size')
      .select('*')
      .where('auction_lot_id', lotId)

    return query.then((auction_bottle_size) => {
      return auction_bottle_size;
    });
  }

  /**
   * Returns array of DocumentRepository response
   *
   * @param  {String} lotId
   * @return {Array}
   */
  getDocumentRepository(lotId) {
    let query;
    query = this.db.knex('document_repository')
      .select('*')
      .where('auction_lot_id', lotId);

    return query.then((document_repository) => {
      return (document_repository[0])?document_repository:null;
    });
  }

  /**
   * Returns array of LotImages response
   *
   * @param  {String} lotId
   * @return {Array}
   */
  getLotImages(lotId) {
    let self = this,
        query;
    query = this.db.knex('auction_lot_image')
      .select(self.db.knex.raw('image_url(?, image_record_id) as thumbnail_url', [this.config.get('imageBaseUrl').replace(/\/?$/, '/')]), 'image_record_id as row_id', 'caption')
      .where('auction_lot_id', lotId);

    return query.then((lot_images) => {
      lot_images.forEach(function (lot_image,i) {
        lot_images[i].detail_url=lot_image.thumbnail_url;
      })
      return lot_images;
    });
  }

  /**
   * Fetch auction-lot count, sold count, active count
   * @param {String} auctionId
   * @return {Array}
   */
  getAuctionLotCount(auctionId) {
    return this.db.knex('auction_lot')
      .select(this.db.knex.raw("count(*) as lot_count,sum(case when status = 'active' then 1 else 0 end) AS active_lot_count,sum(case when status = 'sold' then 1 else 0 end) AS sold_lot_count"))
      .where('auction_id', auctionId)
      .whereNot('status', 'withdrawn')
      .then((result) => result[0]);
  }

  /**
   * Fetch total_hammer_price, total_sold_price
   * @param {String} auctionId
   * @return {Array}
   */
  getAuctionLotSoldPrices(auctionId) {
    return this.db.knex('auction_lot')
      .select(this.db.knex.raw("sum(sold_price) as total_hammer_price,SUM(COALESCE(sold_price,0) + COALESCE(buyers_premium_amount,0)) as total_sold_value"))
      .where('auction_id', auctionId)
      .where('status', 'sold')
      .then((result) => result[0]);
  }


  /**
   * Returns insseted object of artist response
   *
   * @param  {String} artist
   * @param  {String} tenantId
   * @return {Object}
   */
  getOrInsertArtist(artist, tenantId) {
    let self = this,
        query,
        artistData = {};

    query = this.db.knex('artist')
      .where('name', artist)
      .where('tenant_id', tenantId);

    return query.then((_artist) => {
      if (!_artist[0]) {
        artistData.name = artist;
        artistData.tenant_id = tenantId;
        return self.db.knex('artist').insert(artistData).returning('*').then((artist) => {
          return artist[0] || null;
        });
      }
      else {
        return artist[0];
      }
    });
  }

}
export default Model;
