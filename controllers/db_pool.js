const Mysql = require('mysql2/promise');

const sql = Mysql.createPool({
    host: 'localhost',
    user: 'yejun',
    password: 'a12345678',
    database: 'DiaryDB',
    dateStrings : "date"
});

module.exports = sql;