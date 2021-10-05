var bunyan = require('bunyan');
var log = bunyan.createLogger({name: "myapp"});
const { sql } = require('slonik');
const pool = require("../models");
module.exports.list = async (req, res, next) => {
    if(req.body){
        // let list = await pool.many(sql`SELECT * FROM users LEFT JOIN address ON users.id = address.user_id where user.id = 1`);
        let list = await pool.many(sql`SELECT * FROM ${sql.identifier(['users'])}`);
        return res.json(list);
    }else{
        return res.json({
            value: 'Response from list'
        });
    }
    
};