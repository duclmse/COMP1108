const express = require('express');
const router = express.Router();
const bcrypt = require("bcryptjs");
const database = require("../database");

router.get('/', function (req, res, next) {
    console.log(req.connection.remoteAddress);
    const user = req.session.user;
    if (user) res.send(user);
    else res.end()
});

router.get('/signin', (req, res, next) => {
    if (!req.session.user) {
        res.sendFile('signin.html', {root: __dirname + "/../public/"});
        return
    }
    res.writeHead(301, {"Location": "http://" + req.headers['host'] + '/chat'});
    return res.end();
    // res.redirect('/chat');
});

router.post('/signin', (req, res, next) => {
    const username = req.body.username;
    const password = req.body.password;
    const remember = req.body.remember;

    const sql = "SELECT id, username, fullname, email, avatar, hashed_password FROM Users WHERE email = ? OR username = ?";
    const db = database();
    db.get(sql, [username, username]).then(row => {
        if (!row) {
            res.end(JSON.stringify({error: "Username or password is invalid! please try again later."}));
            return;
        }

        bcrypt.compare(password, row.hashed_password, (error, result) => {
            if (error || !result) {
                res.end(JSON.stringify({error: "Username or password is invalid! please try again later."}));
                return;
            }

            req.session.user = row;
            res.redirect("/chat")
        });

    }).catch(() => {
        res.end(JSON.stringify({error: "Username or password is invalid! please try again later."}));
    })
});

router.get('/signup', (req, res) => {
    res.sendFile('signup.html', {root: __dirname + "/../public/"});
});

router.post('/signup', (req, res) => {

});

router.get('/search', (req, res) => {
    console.log(`/user/search %o`, req.body);
    const user = req.session.user;
    const search = req.query.search;
    const page = req.query.page || 0;

    const sql = `SELECT id, fullname, email, avatar FROM Users WHERE (fullname LIKE ? OR  email LIKE ?) AND NOT (id = ?) LIMIT 10 OFFSET ?`;
    const db = database();
    db.all(sql, [`%${search}%`, `%${search}%`, user.id, page * 10]).then(result => {
        res.setHeader('Content-Type', 'application/json');
        res.send(JSON.stringify(result));
    }).catch(err => {
        console.log(err);
    })
});

router.get('/friend', (req, res) => {
    console.log(`/user/friend %o`, req.query);
    const user = req.session.user;
    const search = req.query.search || "";
    const page = req.query.page || 0;

    const db = database();
    const sql = "SELECT user_1, user_2 FROM Relationships WHERE (user_1 = ? OR user_2 = ?) AND status = 2;";

    const user_id = user.id;
    db.all(sql, [user_id, user_id]).then(rows => {
        const friends = [];
        rows.forEach(row => {
            if (row.user_1 === user_id) {
                friends.push(row.user_2)
            } else if (row.user_2 === user_id) {
                friends.push(row.user_1)
            }
        });
        db.close();
        return friends;
    }).then(friends => {
        const frstr = friends.toString();
        const sql = `SELECT id, fullname, email, avatar FROM Users WHERE id IN (${frstr}) AND (fullname LIKE ? OR  email LIKE ?) LIMIT 10 OFFSET ?`;
        db.all(sql, [`%${search}%`, `%${search}%`, page * 10]).then(result => {
            res.setHeader('Content-Type', 'application/json');
            res.send(JSON.stringify(result));
        })
    }).catch(err => {
        console.log(err);
    })
});

const getFriends = (user_id) => {
    const db = database();
    const sql = "SELECT user_1, user_2 FROM Relationships WHERE (user_1 = ? OR user_2 = ?) AND status = 2;";

    return db.all(sql, [user_id, user_id]).then(rows => {
        const friends = [];
        rows.forEach(row => {
            if (row.user_1 === user_id) {
                friends.push(row.user_2)
            } else if (row.user_2 === user_id) {
                friends.push(row.user_1)
            }
        });
        db.close();
        return friends;
    });
};

router.get('/signout', (req, res) => {
    req.session = null;
    res.redirect('/');
});

module.exports = router;
