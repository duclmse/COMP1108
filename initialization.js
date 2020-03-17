const sqlite = require("sqlite3");
const bcrypt = require("bcryptjs");
const fs = require('fs');
const database = require("./database");

const initialization = {
    importMockData: (mockFile) => {
        const db = database();
        const mem = database(":memory:");

        fs.readFile(mockFile, 'utf8', (err, contents) => {
            if (err) {
                return console.log(err);
            }
            let data = JSON.parse(contents);
            const tables = ["RelationshipTypes", "Users", "Relationships", "Chats", "ChatMembers", "Messages"];
            tables.forEach(table => {
                if (data.hasOwnProperty(table)) {
                    processData(db, mem, table, data[table]);
                }
            });
            db.close()
        });
    }
};

const processData = (db, mem, tableName, table) => {
    const {create, cols, data, update, each} = table;

    db.run(create, [], (err) => {
        if (err) {
            if (err.errno === 1) console.log(`Table "${tableName}" has been created already!`);
            return
        }

        const columns = cols.toString();
        insertData(db, tableName, columns, data, each);

        if (update) {
            updateData(db, update)
        }
    })
};

const updateData = (db, update) => {
    const {sql, param} = update;
    bcrypt.genSalt(10, (err, salt) => {
        bcrypt.hash(param, salt, (err, hash) => {
            if (err) return console.log(err);

            db.run(sql, [hash], (err) => {
                if (err) return console.error(err.message);
            })
        });
    });
};

const insertData = (db, table, columns, data, each) => {
    const prepare = columns.replace(/\w+/g, `?`);
    const sql = `INSERT INTO ${table}(${columns}) VALUES (${prepare})`;

    console.log(`Inserting data into the table ${table}`);
    if (each) {
        console.log(`${table}: ${each}`);
    }
    data.forEach(row => {
        db.run(sql, row, (err) => {
            if (err) {
                console.log(`-----------------------------------------------`);
                console.log(err);
                console.log(sql);
            }
        });
        const chat_id = row[0];
        const last_update = row[2];
        if (each) {
            db.run(each, [last_update, chat_id], (err) => {
                if (err) {
                    console.log(`-----------------------------------------------`);
                    console.log(err);
                    console.log(sql);
                }
            });
        }
    });
    console.log(`Done!`);
};

module.exports = initialization;