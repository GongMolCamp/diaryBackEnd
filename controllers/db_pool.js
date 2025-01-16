const Mysql = require('mysql2/promise');

const sql = Mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: 'a1234567',
    database: 'RecipeFrontDB',
    dateStrings : "date"
});

module.exports = sql;