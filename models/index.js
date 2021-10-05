const slonik = require('slonik');

const pool = slonik.createPool('postgres://postgres:Ashish123$@localhost:5432/Ashish8833');

pool.connect((connection) => {
    // You are now connected to the database.
    console.log('Connection status');
    console.log(pool.getPoolState()); //idleConnection will be 1
    console.log('Connection status');
    return;    
})
.then(() => {
  console.log(pool.getPoolState()); // idleConnection will be 0
})
.catch((e) => {
  pool.end();
});


module.exports =  pool;