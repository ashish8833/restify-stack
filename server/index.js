'use strict';

import  bind from 'lodash.bind';
import { createServer } from 'restify';
import corsMiddleware from 'restify-cors-middleware';
import Middleware from'../middleware';
import HealthCheckRoutes from'./routes/health-check';
import ApiRoutes from'./routes/api';
import Constant from '../constants';

// MetricsRoutes = require('./routes/stats'),


export default class Server {
  constructor(logger, db, userManager) {
    this.logger = logger;
    this.db = db;
    this.server = null;
    this.userManager = userManager;

    // set static config for redis for caching
    // _config = this.config.get('redis.cache');
  }

  async start() {
    const me = this;
    console.log("on start");
    await this.userManager.setup()
    me.logger.log('server.start');
    me.setupRestify();
    // setup process userId, groupId
    me.server.on('listening', () => {
      // if (me.config.has('groupId') && process.getgid() !== me.config.get('groupId')) {
      //   process.setgid(me.config.get('groupId'));
      // }

      // if (me.config.has('userId') && process.getuid() !== me.config.get('userId')) {
      //   process.setuid(me.config.get('userId'));
      // }

      me.logger.log('server.started: ${url}', { url: me.server.url });
    });
    me.server.listen(process.env.PORT);
    return me;
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
    this.server = createServer(options);

    // enable CORS for allowed domains
    cors = corsMiddleware({
      origins: Constant.allowCorsForDomains,
      allowHeaders: ['Access-Control-Allow-Origin', 'Authorization', 'Content-Type']
    });
    this.server.pre(cors.preflight)
    this.server.use(cors.actual)

    this.setupMiddleware();

    this.setupRoutes();

    this.server.use((err, req, res, next) => { // eslint-disable-line no-unused-vars
      me.logger.error(err, null, req);
      res.error(err);
    });
  }

  setupMiddleware() {
    this.logger.log('server.start.setupMiddleware');

    this.middleware = new Middleware(this.config, this.logger);

    this.middleware.setupAuthMiddleware(this.server, this.userManager);
  }

  setupRoutes() {
    this.logger.log('server.start.setupRoutes');

    HealthCheckRoutes.create(this.config, this.logger).applyRoutes(this.server, '/health-check');
    // MetricsRoutes.create(this.config, this.logger).applyRoutes(this.server, this.config.get('stats.endpoint'));

    this.middleware.setupAuthRoutes(this.server, this.userManager);

    // all the API endpoints require authentication

    const apiRoutes = ApiRoutes.create(
      this.logger,
      this.db
    );
    apiRoutes.use(this.middleware.Stats.collect);
    apiRoutes.use(bind(this.middleware.authenticate, this.middleware));
    apiRoutes.applyRoutes(this.server, '/v5');
  }
}