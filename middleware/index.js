'use strict';

import { requestToCurl } from '../utils';
import { plugins } from 'restify';
import { HttpError } from 'restify-errors';
import AuthMiddleware from './auth';
import helmet from 'helmet';
import response from './response';

/**
 * Connect/Express custom middleware.
 */
class Middleware {
  constructor(config, logger) {
    this.config = config;
    this.logger = logger;
    this.Auth = AuthMiddleware;
  }

  static _noAuthRoute(req) {
    const path = req.getRoute().path,
          method = req.method,
          routes = [];
          //[
          //  { path: '/v5/services/biddable/deposit', method: 'POST' },
          //  { path: '/v5/services/apps/get-current-time-utc', method: 'GET' },
          //];

    return Array.some(routes, { path, method });
  }

  setupAuthMiddleware(server, userManager) {
    const me = this,
          passport = require('passport'),
          PassportBearerStrategy = require('passport-http-bearer').Strategy,
          PassportAPIKeyStrategy = require('passport-localapikey').Strategy,
          PassportBasicStrategy = require('passport-http').BasicStrategy;

    this.logger.log('middleware.setupAuth');

    // setup middleware
    server.use(helmet(this.config.get('server.helmet')));

    server.use(plugins.acceptParser(server.acceptable));
    server.use(plugins.authorizationParser());
    server.use(plugins.dateParser());
    server.use(plugins.queryParser());
    server.use(response);

    server.use((req, res, next) => {
      if (!res.error) {
        res.error = (error, code = 500, clazz = 'ERROR') => {
          const isError = Error.isError(error),
                isObject = typeof error === "object" && !Array.isArray(error),
                isRestifyError = isError && error instanceof HttpError,
                thisRes = res;

          let data = {},
              message;

          if (isRestifyError) {
            message = error.message;
            code = error.statusCode;
          } else if (isObject) {
            message = error.message || 'Error';
            clazz = error.class || clazz;

            if (Number.isNumber(error.code)) {
              code = error.code;
            }
          } else {
            message = error;
          }

          if (Error.isError(message)) {
            me.logger.error('error:', message);
          }

          data = {
            message: message,
            code: code,
            class: clazz,
          };

          me.logger.error(`response.error[${code}]: ${message}`, data);

          thisRes.setHeader('Content-Type', 'application/json');
          thisRes.statusCode = code;
          thisRes.end(JSON.stringify({ error: data }));
        };
      }

      next();
    });

    server.use(plugins.jsonp());
    server.use(plugins.gzipResponse());
    server.use(plugins.acceptParser(server.acceptable));
    server.use(plugins.queryParser());
    server.use(plugins.bodyParser({multiples: true}));
    
    if (this.config.has('server.throttle')) {
      server.use(plugins.throttle(this.config.get('server.throttle')));
    }

    server.use(plugins.conditionalRequest());

    // PASSPORT

    passport.serializeUser((user, done) => {
      done(null, userManager.serializeUser(user));
    });

    passport.deserializeUser((userId, done) => {
      return userManager.getUserWithUsername(userId)
        .then((user) => {
          if (user) {
            done(null, user);
          } else {
            done(new Error('Unknown user'), null);
          }
        });
    });

    // basic
    passport.use(new PassportBasicStrategy(
      (username, password, done) => {
        return userManager.getUserWithUsername(username, password)
          .then((user) => {
            if (user && user.password === password) {
              return done(null, user);
            }
            return done(null, false);
          });
      })
    );

    // Bearer
    passport.use(new PassportBearerStrategy(
      (token, done) => {
        return userManager.getUserWithAccessToken(token)
          .then((user) => {
            if (user) {
              return done(null, user);
            }
            return done(null, false);
          });
      })
    );

    // API Key
    passport.use(new PassportAPIKeyStrategy(
      (apiKey, done) => {
        return userManager.getUserWithAPIKey(apiKey)
          .then((user) => {
            if (user) {
              return done(null, user);
            }
            return done(null, false);
          });
      })
    );

    // setup
    server.use(passport.initialize());
    server.use(passport.session());
    this.passportAuthenticate = passport.authenticate(['basic', 'bearer', 'localapikey'], { session: false });
    this.passport = passport;

    // curl logger
    if (this.config.get('developmentMode') === true) {
      server.use((req, res, next) => {
        me.logger.log('request.curl: ${curl}\n', { curl: requestToCurl(req) });

        next();
      });
    }
  }

  /**
   * Middleware used to handle both cookie based and api key/token auth methods.
   *
   * @param  {Object}   req - connect/express request
   * @param  {Object}   res - connect/express response
   * @param  {Function} next - next request processor
   * @return {undefined} nothing
   */
  authenticate(req, res, next) {
    const noAuthRoute = Middleware._noAuthRoute(req),
          alreadyAuthenticated = req.user;

    if (noAuthRoute || alreadyAuthenticated) {
      return next();
    }

    return this.passportAuthenticate(req, res, next);
  }
}

export default Middleware;
