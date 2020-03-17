const express = require('express');
const router = express.Router();
const database = require("../database");

router.get('/', (req, res, next) => {
    if (!req.session.user) {
        res.redirect('/user/signin');
    } else {
        res.sendFile('chat.html', {root: __dirname + "/../public/"});
    }
});

router.get('/recent', (req, res, next) => {
    res.setHeader('Content-Type', 'application/json');
    const user = req.session.user;
    if (!user) {
        res.end(JSON.stringify({error: "You do not have the permission to access the data"}));
        return
    }
    console.log("/chat/recent %o", req.query);
    const page = req.query.page || 0;
    const id = req.query.id;

    const db = database();
    let sqlFragment;
    let param;
    if (id) {
        sqlFragment = `C.id = ?`;
        param = [id, page * 10]
    } else {
        sqlFragment = `C.id IN (SELECT id FROM Chats JOIN ChatMembers CM ON Chats.id = CM.chat_id WHERE user_id = ?) AND NOT (CM.user_id = ?)`;
        param = [user.id, user.id, page * 10]
    }

    //language=SQL
    const sql = `SELECT CM.chat_id, C.name, C.avatar, group_concat(U.fullname) AS everyone, group_concat(U.id) AS ids, last_update, content, M.user_id, U2.fullname FROM Chats C
                 JOIN ChatMembers CM ON C.id = CM.chat_id JOIN Users U ON U.id = CM.user_id
                 JOIN Messages M ON C.id = M.chat_id JOIN Users U2 ON U2.id = M.user_id
        WHERE ${sqlFragment} AND TIME = last_update GROUP BY CM.chat_id ORDER BY last_update DESC LIMIT 10 OFFSET ?;`;
    db.all(sql, param).then(recent => {
        res.send(JSON.stringify(recent));
        db.close();
    });
});

router.post('/content', async (req, res, next) => {
    const user = req.session.user;
    res.setHeader('Content-Type', 'application/json');
    if (!user) {
        res.send(JSON.stringify({error: "You don't have privilege to access this data!"}))
    }

    const oldest = req.body.oldest;
    const last_update = req.body.last_update;

    let chat_id = req.body.id;
    const user_id = req.body.user;
    const db = database();
    if (!chat_id && (user_id !== null || user_id !== undefined)) {
        chat_id = await getOrCreateChat(db, user_id, user.id);
    }
    const paramContent = [chat_id];

    const old = oldest ? "AND time < ?" : "";
    if (oldest) {paramContent.push(oldest)}

    const update = oldest ? "AND time > ?" : "";
    if (last_update) {paramContent.push(last_update)}

    //language=SQL
    const sqlContent = `SELECT user_id, content, time FROM Messages M JOIN Chats C ON M.chat_id = C.id WHERE chat_id = ? ${old} ${update} ORDER BY TIME DESC LIMIT 10`;
    const content = db.all(sqlContent, paramContent);
    const member = getMembers(db, chat_id);
    Promise.all([member, content]).then(values => {
        res.send(JSON.stringify({id: chat_id, members: values[0], content: values[1]}));
        db.close();
    })
});

const getOrCreateChat = (db, user_1, user_2) => {
    // language=SQLite format=false
    const sql = `SELECT chat_id, count(chat_id) AS count FROM ChatMembers WHERE chat_id IN (SELECT CM.chat_id FROM ChatMembers CM WHERE CM.user_id = ? INTERSECT SELECT CM2.chat_id FROM ChatMembers CM2 WHERE CM2.user_id = ?) GROUP BY chat_id`;

    return db.all(sql, [user_1, user_2]).then(result => {
        if (result.length === 1) {
            return result[0].chat_id
        } else {
            for (const row of result) {
                if (row.count === 2) {return row.chat_id;}
            }
            return createChat(db, user_1, user_2)
        }
    })
};

const createChat = (db, user_1, user_2) => {
    const sqlInsert = "INSERT INTO Chats (name, avatar) VALUES (?, ?)";
    const sqlChat = "INSERT INTO ChatMembers (chat_id, user_id)  VALUES (?, ?), (?, ?)";
    const param = [null, "/images/default_avatar.png"];
    return db.run(sqlInsert, param).then(result => result.lastID).then(id => {
        db.run(sqlChat, [id, user_1, id, user_2])
        return id
    }).catch(err => err)
};

router.post('/member', (req, res, next) => {
    const chat_id = req.body.id;
    const db = database();
    getMembers(chat_id).then(members => {
        res.setHeader('Content-Type', 'application/json');
        res.send(JSON.stringify(members));
        db.close();
    })
});

const getMembers = (db, chat) => {
    //language=SQL
    const sqlMember = `SELECT user_id, nickname, fullname, avatar
                       FROM ChatMembers CM
                                JOIN Users U ON CM.user_id = U.id
                       WHERE chat_id = ?`;
    return db.all(sqlMember, [chat]);
};

module.exports = router;