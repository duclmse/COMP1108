const path = require('path');
const sqlite = require("sqlite3");

const dbPath = path.resolve(__dirname, "./resources/db/comp1108.sqlite");

const database = () => {
    let db = new sqlite.Database(dbPath);

    return {
        getDb: () => new sqlite.Database(dbPath),

        all: (sql, params) => new Promise((resolve, reject) => {
            db.all(sql, params, (err, rows) => {
                if (err) {reject(err)} else resolve(rows);
            })
        }),

        get: (sql, params) => new Promise((resolve, reject) => {
            db.get(sql, params, (err, rows) => {
                if (err) {reject(err)} else resolve(rows);
            })
        }),

        close: () => db.close()
    }
};

module.exports = database;