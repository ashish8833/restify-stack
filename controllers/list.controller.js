var bunyan = require('bunyan');
var log = bunyan.createLogger({name: "myapp"});
module.exports.list = (req, res, next) => {
    log.error("List api");
    res.json({
        value: 'Response from list'
    });
};