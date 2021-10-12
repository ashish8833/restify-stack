'use strict';

import trim from 'lodash.trim';
import { format } from 'util';
import { stringify } from 'querystring';
import AuthMiddleware from './middleware/auth';

/**
 * Some utilities.
 */
class Utils {
  constructor(logger, db) {
    this.logger = logger;
    this.db = db;
  }

  /**
   * Creates a curl-compatible string out of a request.
   *
   * @param  {Object} req - connect/express request object
   * @return {String} curl request
   */
  static requestToCurl(req) {
    let curl,
        body = req.body && format('-d \'%s\' ', JSON.stringify(req.body)) || '',
        qs = req.qs && stringify(req.qs) || '',
        discardedHeaders = ['host', 'connection'],
        host,
        port,
        url;

    host = req.headers.host.split(':');
    if (host.length === 1) {
      host = host[0];
      port = req.headers['x-forwarded-port'] || '80';
    } else {
      port = host[1];
      host = host[0];
    }

    url = format('%s://%s:%s%s',
      req.headers['x-forwarded-proto'] || 'http',
      host,
      port,
      req.href()
    );

    curl = format(
      'reqId: %s \ncurl -X %s %s %s\'%s%s\'',
      req.id(),
      req.method,
      req.headers.reduce((a, v, k) => {
        if (discardedHeaders.indexOf(k) === -1 && k.lastIndexOf('x-') === -1) {
          a.push(format('-H \'%s:%s\'', k, v));
        }
        return a;
      }, []).join(' '),
      body,
      url,
      qs
    );

    return curl;
  }

  static isTrue(v) {
    if (typeof v === 'string') {
      v = v.toLowerCase();
    }

    return v === true || v === 1 || v === '1' || v === 't' || v === 'true';
  }

  static isFalse(v) {
    if (typeof v === 'string') {
      v = v.toLowerCase();
    }

    return v === false || v === 0 || v === '0' || v === 'f' || v === 'false';
  }

  static contactFormatter(contactDef, targetClient) {
    let contact;

    if (typeof contactDef === 'object' && !Array.isArray(contactDef)) {
      contact = contactDef.value;

      if (typeof contactDef.formatters === 'object' && !Array.isArray(contactDef.formatters) 
      && typeof contactDef.formatters[targetClient] === 'object' && !Array.isArray(contactDef.formatters[targetClient])) {
        let formatter = contactDef.formatters[targetClient];

        contact = contact.replace(new RegExp(trim(formatter.regex), '/'), formatter.format);
      }
    } else if (typeof contactDef === 'string') {
      contact = contactDef;
    }

    return contact;
  }

  static msDiff(start) {
    const diff = process.hrtime(start);

    return Math.round((diff[0] * 1e9 + diff[1]) / 1000000);
  }

  /**
   * Check if user has an admin role
   *
   * @param  {Object} user
   * @return {boolean}
   */
  static isAdmin(user) {
    return AuthMiddleware.hasRole(user, 'admin') || AuthMiddleware.hasRole(user, 'root');
  }

  /**
   * @method queryFromRequest
   * @description helper function to obtain params from request
   * @param {http.Request} req
   * @param {object} req.query
   * @param {Boolean} [onlyBasicParams=false]
   * @return {{where: {ids: (*|String|null), fieldset: (*|String|null)}}}
   */
  static queryFromRequest(req, onlyBasicParams = false) {
    let q = req.query,
        body = req.body,
        fieldset,
        offset,
        limit,
        where,
        arrayParams = [
          'fieldset',
          'order_by',
          'order',
          'status',
        ];

    Object.keys(q).forEach(function (key) {
      if (arrayParams.includes(key)) {
        q[key] = q[key].replace(/\+/g, ' ');
      }
    });

    if (body) {
      fieldset = body && body.fieldset && body.fieldset.split(' ') || ['summary'];
      offset = +body.offset  ||+body.o || 0;
      limit = +body.limit ||+body.n || 30;
    } else {
      fieldset = q.fieldset && q.fieldset.split(' ') || ['summary'];
      offset = +q.offset || +q.o || 0;
      limit = +q.limit || +q.n || 30;
    }

    if (!onlyBasicParams) {
      where = {
        lotIds: body && body.lot_ids || null, // eslint-disable-line am_camelcase
        tenantId: req.user.override_tenant_id || req.user.tenant_id, // eslint-disable-line am_camelcase
        auctionId: (body && body.auction_id) || q.auction_id || null, // eslint-disable-line am_camelcase
        asUserId: req && req.user && req.user._kind === 'customer' && req.user.row_id || null, // eslint-disable-line am_camelcase
      };
    }

    return {
      fieldset,
      limit,
      offset,
      isAdmin: Utils.isAdmin(req && req.user),
      user: req && req.user,
      where,
    };
  }

}

export default Utils;
