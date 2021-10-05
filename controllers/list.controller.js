var bunyan = require('bunyan');
var log = bunyan.createLogger({name: "myapp"});
const slonik = require('slonik');
const pool = require("../models");
module.exports.list = async (req, res, next) => {
    if(req.body){
        let list = await pool.many(slonik.sql`SELECT * FROM ${slonik.sql.identifier(['users'])}`);
        return res.json(list);
    }else{
        return res.json({
            value: 'Response from list'
        });
    }
    
};