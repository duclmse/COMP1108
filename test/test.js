const database = require("../database");

const create = "CREATE TABLE Test (id INTEGER PRIMARY KEY, name TEXT)";
const sql = "INSERT INTO Test (name) VALUES (?)";

const db = database();
db.run(sql, ['abc'], function (err) {
    console.log(err);
    console.log(this);
});
