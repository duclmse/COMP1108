const express = require('express');
const router = express.Router();
const path = require('path');
const database = require("../database");

router.get('/', (req, res, next) => {
    if (!req.session.user) {
        res.redirect('/user/signin');
    } else {
        res.sendFile('chat.html', {root: __dirname + "/../public/"});
    }
});

router.post('/', (req, res, next) => {
    res.setHeader('Content-Type', 'application/json');
    const user = req.session.user;
    if (!user) {
        res.end(JSON.stringify({error: "You do not have the permission to access the data"}));
        return
    }
    // const chat_id ;
});

router.get('/recent', (req, res, next) => {
    res.setHeader('Content-Type', 'application/json');
    const user = req.session.user;
    if (!user) {
        res.end(JSON.stringify({error: "You do not have the permission to access the data"}));
        return
    }

    const db = database();
    const page = req.body.page || 0;

    const sql = `SELECT CM.chat_id, C.name, C.avatar, group_concat(U.fullname) AS everyone, group_concat(U.id) AS ids, last_update, content, M.user_id, U2.fullname
        FROM Chats C
                 JOIN ChatMembers CM ON C.id = CM.chat_id
                 JOIN Messages M ON C.id = M.chat_id
                 JOIN Users U ON CM.user_id = U.id
                 JOIN Users U2 ON U2.id = M.user_id
        WHERE C.id IN (SELECT id FROM Chats JOIN ChatMembers CM ON Chats.id = CM.chat_id WHERE user_id = ?)
          AND NOT (CM.user_id = ?) AND TIME = last_update
        GROUP BY CM.chat_id
        ORDER BY last_update DESC LIMIT 10 OFFSET ?;`;
    db.all(sql, [user.id, user.id, page * 10]).then(recent => {
        res.send(JSON.stringify(recent));
    });
    db.close();
});

router.post('/content', (req, res, next) => {
    const chat = req.body.chatId;
    const page = req.body.page || 0;

    const db = database();
    const sqlContent = `SELECT user_id, content, time FROM Messages M JOIN Chats C 
        ON M.chat_id = C.id WHERE chat_id = ? ORDER BY time DESC LIMIT 10 OFFSET ?;`;
    const sqlMember = `SELECT user_id, nickname, fullname, avatar FROM ChatMembers CM JOIN Users U 
        ON CM.user_id = U.id WHERE chat_id = ?`;
    const member = db.all(sqlMember, [chat]);
    const content = db.all(sqlContent, [chat, page * 10]);

    Promise.all([member, content]).then(values => {
        res.setHeader('Content-Type', 'application/json');
        res.send(JSON.stringify({
            //FIXME
            info: {avatar: "/images/default_avatar.png"},
            members: values[0],
            content: values[1]
        }));
        db.close();
    })

});

module.exports = router;