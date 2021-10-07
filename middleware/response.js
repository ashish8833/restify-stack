'use strict';

function sendResponse(data) {
  /* jshint validthis:true */
  const res = this,
      page,
      Recase = require('recase'),
      recase = Recase.create({exceptions: {}});

  if (!res) {
    throw new Error('You called `send()`, detatched send from the response object');
  }

  if (Array.isArray(data)) {
    page = true;
  }

  if (data) {
    res.setHeader('Content-Type', 'application/json');
    data = recase.snakeCopy(data);
    data = JSON.stringify(data, null, '  ');
  } else {
    data = undefined;
  }

  if (page) {
    res.end('{ "result_page": ' + data + ' }');
  } else {
    res.end('{ "response": ' + data + ' }');
  }
}

function sendRawJsonResponse(data) {
  /* jshint validthis:true */
  var res = this;

  if (!res) {
    throw new Error('You called `send()`, detatched send from the response object');
  }

  if (data) {
    res.setHeader('Content-Type', 'application/json');
    data = JSON.stringify(data);
  } else {
    data = undefined;
  }

  res.end(data);
}

/**
 * sendPaginatedResponse helper to wrap data in common api response
 * @param {object} data - data to send
 * @param {string} url - base url of response
 * @param {number} offset
 * @param {number} limit
 * @param {number} totalNumResults
 * @param {String} [nextContinuationToken]
 * @param {object} extraData - objects which are not part of result_page or query_info e.g. extra counts
 */
function sendPaginatedResponse(data, url, offset, limit, totalNumResults, nextContinuationToken, extraData) {
  /* jshint validthis:true */
  const res = this,
      URL = require('url'),
      parsedUrl = URL.parse(url, true),
      prevOffset,
      prevLimit,
      queryInfo = {
        page_size: limit, // eslint-disable-line am_camelcase
        total_num_results: 'undefined' === typeof totalNumResults ? 0 : totalNumResults, // eslint-disable-line am_camelcase
        page_start_offset: offset, // eslint-disable-line am_camelcase
        prev_page: null,// eslint-disable-line am_camelcase
        base_query: null,
        next_page: null 
      },
      recase = require('recase').Recase.create({ exceptions: {} }),
      extraInfo = extraData || {};

  // I want to change the query parameters around, so I need to nuke all other places they are stored than the query object
  parsedUrl.path = parsedUrl.pathname;
  parsedUrl.href = parsedUrl.pathname;
  parsedUrl.search = null;

  if (!res) {
    throw new Error('You called `sendPaginated()`, detatched send from the response object');
  }

  if (!Array.isArray(data)) {
    throw new Error('sendPaginated() requires an array of data');
  }

  res.setHeader('Content-Type', 'application/json');
  data = recase.snakeCopy(data);
  data = JSON.stringify(data, null, '  ');

  delete parsedUrl.query.offset;
  delete parsedUrl.query.limit;
  delete parsedUrl.query.o;
  delete parsedUrl.query.n;

  queryInfo.base_query = URL.format(parsedUrl); // eslint-disable-line am_camelcase

  if (offset > 0) {
    prevOffset = offset - limit;
    prevLimit = limit;
    if (prevOffset < 0) {
      prevOffset = 0;
      prevLimit = offset;
    }
    parsedUrl.query.o = prevOffset;
    parsedUrl.query.n = prevLimit;
    queryInfo.prev_page = URL.format(parsedUrl); // eslint-disable-line am_camelcase

    delete parsedUrl.query.o;
    delete parsedUrl.query.n;
  }

  parsedUrl.query.o = offset + limit;
  parsedUrl.query.n = limit;

  if (offset + limit <= totalNumResults) {
    queryInfo.next_page = URL.format(parsedUrl); // eslint-disable-line am_camelcase
  } else {
    queryInfo.next_page = null; // eslint-disable-line am_camelcase
  }

  // s3 calls
  if (nextContinuationToken && typeof nextContinuationToken === 'string') {
    parsedUrl = URL.parse(url, true);
    delete parsedUrl.query.o;
    delete parsedUrl.query.n;
    delete parsedUrl.search;
    parsedUrl.query.nextContinuationToken = nextContinuationToken;
    queryInfo.next_page = URL.format(parsedUrl); // eslint-disable-line am_camelcase
    queryInfo.prev_page = null; // eslint-disable-line am_camelcase
    queryInfo.page_size = totalNumResults; // eslint-disable-line am_camelcase
  } else if (typeof nextContinuationToken === 'string' && !nextContinuationToken) {
    delete parsedUrl.query.o;
    delete parsedUrl.query.n;
    delete parsedUrl.query.nextContinuationToken;
    queryInfo.next_page = null; // eslint-disable-line am_camelcase
    queryInfo.prev_page = null; // eslint-disable-line am_camelcase
    queryInfo.page_size = totalNumResults; // eslint-disable-line am_camelcase
  }
  let endResult = { result_page: JSON.parse(data), query_info: queryInfo};
  res.end(JSON.stringify(...endResult, ...extraInfo));
}

export default function (req, res, next) {
  if (!res.send) {
    res.send = sendResponse;
  } else {
    res.__st_send = res.send; // eslint-disable-line am_camelcase
    res.send = sendResponse;
  }

  res.sendPaginated = sendPaginatedResponse;

  // for cases where we need to send RAW json exactly as is.
  res.sendRawJson = sendRawJsonResponse;

  next();
};
