'use strict';

const _ = require('lodash'),
      PromiseA = require('bluebird'),
      fs = require('fs-extra'),
      restify = require('restify'),
      CacheMiddleware = require('../middleware/cache'),
      corsMiddleware = require('restify-cors-middleware');

class Server {
  constructor(config, logger, db, userManager) {
    this.config = config;
    this.logger = logger;
    this.db = db;
    this.server = null;
    this.userManager = userManager;

    // set static config for redis for caching
    CacheMiddleware.config = this.config.get('redis.cache');
  }

  start() {
    const me = this;

    return PromiseA.join(
      this.userManager.setup()
    )
      .then(() => {
        me.logger.log('server.start');

        me.setupRestify();

        // setup process userId, groupId
        me.server.on('listening', () => {
          if (me.config.has('groupId') && process.getgid() !== me.config.get('groupId')) {
            process.setgid(me.config.get('groupId'));
          }

          if (me.config.has('userId') && process.getuid() !== me.config.get('userId')) {
            process.setuid(me.config.get('userId'));
          }

          me.logger.log('server.started: ${url}', { url: me.server.url });
        });

        me.server.listen(
          parseInt(me.config.get('server.port'), 10),
          me.config.get('server.address')
        );

        return me;
      });
  }

  shutdown() {
    const me = this;

    this.logger.log('server.shutdown');
    return new PromiseA((resolve) => {
      this.server.close(function () {
        me.logger.log('server.closed');
        resolve();
      });
    });
  }

  setupRestify() {
    const me = this;
    let options,
        cors;

    if (this.config.get('server.isSecure') === true) {
      options = {
        key: fs.readFileSync(this.config.get('server.key')),
        // FIXME: THIS SHOULD BE THE  ../ssl/cert-bundle.pem BUNDLE CREATED WITH SOMETHING
        // FIXME: SIMILAR TO THE auction-realtime-nodejs-server/cas/create-bundle.sh SCRIPT
        // FIXME: WARNING!!!!!!! NOT TESTED HAS I DO NOT HAVE THE SSL FILES
        // FIXME: https://github.com/coolaj86/node-ssl-root-cas
        certificate: fs.readFileSync(this.config.get('server.cert')),
        ca: fs.readFileSync(this.config.get('server.ca')),
      };
    }

    this.server = restify.createServer(options);

    // enable CORS for allowed domains
    cors = corsMiddleware({
      origins: this.config.get('allowCorsForDomains'),
      allowHeaders: ['Access-Control-Allow-Origin', 'Authorization', 'Content-Type']
    });
    this.server.pre(cors.preflight)
    this.server.use(cors.actual)

    this.setupMiddleware();

    this.setupRoutes();

    this.server.use((err, req, res, next) => { // eslint-disable-line no-unused-vars
      me.logger.error(err, null, req);

      if (me.config.get('developmentMode') !== true) {
        delete err.error.stack;
      }

      res.error(err);
    });
  }

  setupMiddleware() {
    const Middleware = require('../middleware');

    this.logger.log('server.start.setupMiddleware');

    this.middleware = new Middleware(this.config, this.logger);

    this.middleware.setupAuthMiddleware(this.server, this.userManager);
  }

  setupRoutes() {
    const HealthCheckRoutes = require('./routes/health-check'),
          MetricsRoutes = require('./routes/stats'),
          ApiRoutes = require('./routes/api');
    let apiRoutes;

    this.logger.log('server.start.setupRoutes');

    HealthCheckRoutes.create(this.config, this.logger).applyRoutes(this.server, '/health-check');
    MetricsRoutes.create(this.config, this.logger).applyRoutes(this.server, this.config.get('stats.endpoint'));

    this.middleware.setupAuthRoutes(this.server, this.userManager);

    // all the API endpoints require authentication

    apiRoutes = ApiRoutes.create(
      this.config,
      this.logger,
      this.db
    );
    apiRoutes.use(this.middleware.Stats.collect);
    apiRoutes.use(_.bind(this.middleware.authenticate, this.middleware));
    apiRoutes.applyRoutes(this.server, '/v5');
  }
}

module.exports = Server;