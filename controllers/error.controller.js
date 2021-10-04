/**
 * This controller represet of error handle by restify error 
 */



var errs = require('restify-errors');

module.exports.UnauthorizedError = (req, res, next) => {
    return next(new errs.UnauthorizedError("User don't have access."));
}

module.exports.BadDigestError = (req, res, next) => {
    return next(new errs.BadDigestError());
}


/**
 
*** Build in error ***
BadRequestError (400 Bad Request)
UnauthorizedError (401 Unauthorized)
PaymentRequiredError (402 Payment Required)
ForbiddenError (403 Forbidden)
NotFoundError (404 Not Found)
MethodNotAllowedError (405 Method Not Allowed)
NotAcceptableError (406 Not Acceptable)
ProxyAuthenticationRequiredError (407 Proxy Authentication Required)
RequestTimeoutError (408 Request Time-out)
ConflictError (409 Conflict)
GoneError (410 Gone)
LengthRequiredError (411 Length Required)
PreconditionFailedError (412 Precondition Failed)
RequestEntityTooLargeError (413 Request Entity Too Large)
RequesturiTooLargeError (414 Request-URI Too Large)
UnsupportedMediaTypeError (415 Unsupported Media Type)
RequestedRangeNotSatisfiableError (416 Requested Range Not Satisfiable)
ExpectationFailedError (417 Expectation Failed)
ImATeapotError (418 I’m a teapot)
UnprocessableEntityError (422 Unprocessable Entity)
LockedError (423 Locked)
FailedDependencyError (424 Failed Dependency)
UnorderedCollectionError (425 Unordered Collection)
UpgradeRequiredError (426 Upgrade Required)
PreconditionRequiredError (428 Precondition Required)
TooManyRequestsError (429 Too Many Requests)
RequestHeaderFieldsTooLargeError (431 Request Header Fields Too Large)
InternalServerError (500 Internal Server Error)
NotImplementedError (501 Not Implemented)
BadGatewayError (502 Bad Gateway)
ServiceUnavailableError (503 Service Unavailable)
GatewayTimeoutError (504 Gateway Time-out)
HttpVersionNotSupportedError (505 HTTP Version Not Supported)
VariantAlsoNegotiatesError (506 Variant Also Negotiates)
InsufficientStorageError (507 Insufficient Storage)
BandwidthLimitExceededError (509 Bandwidth Limit Exceeded)
NotExtendedError (510 Not Extended)
NetworkAuthenticationRequiredError (511 Network Authentication Required)
BadDigestError (400 Bad Request)
BadMethodError (405 Method Not Allowed)
InternalError (500 Internal Server Error)
InvalidArgumentError (409 Conflict)
InvalidContentError (400 Bad Request)
InvalidCredentialsError (401 Unauthorized)
InvalidHeaderError (400 Bad Request)
InvalidVersionError (400 Bad Request)
MissingParameterError (409 Conflict)
NotAuthorizedError (403 Forbidden)
RequestExpiredError (400 Bad Request)
RequestThrottledError (429 Too Many Requests)
ResourceNotFoundError (404 Not Found)
WrongAcceptError (406 Not Acceptable)
400 BadDigestError
405 BadMethodError
500 InternalError
409 InvalidArgumentError
400 InvalidContentError
401 InvalidCredentialsError
400 InvalidHeaderError
400 InvalidVersionError
409 MissingParameterError
403 NotAuthorizedError
412 PreconditionFailedError
400 RequestExpiredError
429 RequestThrottledError
404 ResourceNotFoundError
406 WrongAcceptError

*/