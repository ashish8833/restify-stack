// List of controller 
const list = require('./controllers/list.controller');
const error = require('./controllers/error.controller');
const middleware = require('./middleware/sample.middleware');
// Controller attach to route.
module.exports = server => {
    server.get('/list', list.list);
    server.get('/error/unauthorized', error.UnauthorizedError);
    server.get('/error/baddigest', error.BadDigestError);
    server.post('/middleware/test', middleware.addValues, list.list);
};

