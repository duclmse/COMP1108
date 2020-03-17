const path = require('path');
const sqlite = require("sqlite3");

const dbPath = path.resolve(__dirname, "./resources/db/comp1108.sqlite");

const database = (name) => { // :memory:
    let db = new sqlite.Database(name || dbPath);

    return {
        getDb: () => new sqlite.Database(dbPath),

        insert: (sql, params, callback) => new Promise((resolve, reject) => {
            db.run(sql, params, function (err) {
                if (err) {reject(err)} else {resolve(this)}
            })
        }),

        all: (sql, params) => new Promise((resolve, reject) => {
            db.all(sql, params, (err, rows) => {
                if (err) {reject(err)} else {resolve(rows)}
            })
        }),

        get: (sql, params) => new Promise((resolve, reject) => {
            db.get(sql, params, (err, rows) => {
                if (err) {reject(err)} else {resolve(rows)}
            })
        }),

        run: (sql, params, callback) => db.run(sql, params, callback),

        close: () => db.close()
    }
};

module.exports = database;