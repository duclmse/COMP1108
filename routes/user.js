const express = require('express');
const router = express.Router();
const bcrypt = require("bcryptjs");
const database = require("../database");

router.get('/', function (req, res, next) {
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
    console.log(`username: ${username}, password: ${password}, remember: ${remember}`);
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
    }).finally(() => {
        db.close();
    });
});

router.get('/signup', (req, res) => {
    res.sendFile('signup.html', {root: __dirname + "/../public/"});
});

router.post('/signup', (req, res) => {

});

router.get('/search', (req, res) => {
    const search = req.body.search;
    const page = req.body.page;
    
    const sql = `SELECT * FROM Users WHERE fullname LIKE ? OR  email LIKE ? LIMIT 10 OFFSET ?`;

});

router.get('/signout', (req, res) => {
    req.session = null;
    res.redirect('/');
});

module.exports = router;
