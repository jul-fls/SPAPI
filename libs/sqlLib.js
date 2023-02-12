const mysql = require('mysql2/promise');

async function connect(query) {
    try {
        // create a connection to the database
        const pool = await mysql.createPool({
            user: 'spapi',
            password: 'If[DBZOyo8ov5iNU',
            host: '127.0.0.1',
            database: 'spapi',
            waitForConnections: true,
            connectionLimit: 10,
            port: 3306,
            maxIdle: 10, // max idle connections, the default value is the same as `connectionLimit`
            idleTimeout: 60000, // idle connections timeout, in milliseconds, the default value 60000
            queueLimit: 0
        });
        return pool;
    } catch (err) {
        console.error(err);
    }
}

async function run(query) {
    try {
        const pool = await connect();
        const [rows, fields] = await pool.execute(query);
        await pool.end();
        return rows;
    } catch (err) {
        console.error(err);
        return null;
    }
}
module.exports =
    {
        run: run
    };