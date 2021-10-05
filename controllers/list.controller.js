var bunyan = require('bunyan');
var log = bunyan.createLogger({name: "myapp"});
module.exports.list = (req, res, next) => {
    if(req.body){
        res.json(req.body);
    }else{
        res.json({
            value: 'Response from list'
        });
    }
    
};