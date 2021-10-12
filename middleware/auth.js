'use strict';
import pkg from 'restify-errors';
const { UnauthorizedError } = pkg;
/**
 * Connect/Restify custom middleware.
 */
class AuthMiddleware {
  /**
   * Check if at least one authorization check passes.
   *
   * @param  {string|Object} user - username string or an user object.
   * @param  {Array} authChecks - authorization checks.
   * @return {boolean} true if the user passes at least one authorization check.
   */
  static hasOneAuth(user, authChecks) {
    let hasAuth = false;

    if (user) {
      if (Array.some(authChecks, (authCheck) => {
        const [check, value] = authCheck;

        switch (check) {
            case 'role':
                return AuthMiddleware.hasRole(user, value);
            case 'permission':
                return AuthMiddleware.hasPermission(user, value);
        }
      })) {
        hasAuth = true;
      }
    }

    return hasAuth;
  }

  /**
   * Authorization middleware that verifies that a user has at least one
   * of required authorizations.
   *
   * @param  {Array} role - required role.
   * @param  {arguments} authChecks - authorization checks.
   * @return {function} middleware function handling user auth check.
   */
  static needsOneAuth(...args) {
    let me = this;
    const authChecks = [...args];

    return function (req, res, next) {
      let err;

      if (!req.user || !me.hasOneAuth(req.user, authChecks)) {
        err = new UnauthorizedError('Invalid authorization');
      }

      return next(err);
    };
  }

  /**
   * Check if a user has a given role.
   *
   * @param  {string|Object} user - username string or an user object.
   * @param  {string} role - role name.
   * @return {boolean} true if the user has the requested role.
   */
  static hasRole(user, role) {
    let hasRole = false;

    if (user) {
      if (Array.isArray(user.roles)) {
        hasRole = typeof user === 'object' &&
        !Array.isArray(user) &&
        Array.isArray(user.roles) &&
          (user.roles.indexOf(role) > -1 || user.roles.indexOf('*') > -1);
      } else {
        if (user.override_tenant_id && user.tenant_id === user.override_tenant_id) {
          hasRole = role === 'root';
        } else if (user.override_tenant_id) {
          hasRole = role === 'admin';
        } else {
          hasRole = role === 'user';
        }
      }
    }

    return hasRole;
  }

  /**
   * Authorization middleware that verifies that a user has the required role.
   *
   * @param  {string} role - required role.
   * @return {function} middleware function handling user role check.
   */
  static needsRole(role) {
    let me = this;

    return function (req, res, next) {
      let err;

      if (!req.user || !me.hasRole(req.user, role)) {
        err = new UnauthorizedError('Unauthorized Access');
      }

      return next(err);
    };
  }

  /**
   * Check if a user has a given permission.
   *
   * @param  {string|Object} user - username string or an user object.
   * @param  {string} permission - permission name.
   * @return {boolean} true if the user has the requested permission.
   */
  static hasPermission(user, permission) {
    let hasPermission = false;

    if (user && Array.isArray(user.permissions)) {
      return user.permissions.indexOf(permission) > -1;
    }

    return hasPermission;
  }

  /**
   * Authorization middleware that verifies that a user has the required permission.
   *
   * @param  {string} permission - required permission.
   * @return {function} middleware function handling user permission check.
   */
  static needsPermission(permission) {
    let me = this;

    return function (req, res, next) {
      let err;

      if (!req.user || !me.hasPermission(req.user, permission)) {
        err = new UnauthorizedError('Invalid permission');
      }

      return next(err);
    };
  }
}

export default AuthMiddleware;
