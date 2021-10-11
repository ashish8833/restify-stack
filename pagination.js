'use strict';


class PaginationHelper {
  constructor(config) {
    this.config = config;
  }

  static getFullURL(req) {
    let host = req.headers.host,
        href = 'https://' + host;

    if (!host || '' === host) {
      href = this.config.href;
    }

    return href + req.originalUrl;
  }
}

export default PaginationHelper;