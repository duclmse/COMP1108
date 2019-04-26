const express = require('express');
const path = require('path');
const logger = require('morgan');
const cookieSession = require('cookie-session');
const bodyParser = require('body-parser');

const indexRouter = require('./routes/index');
const userRouter = require('./routes/user');
const chatRouter = require('./routes/chat');

const app = express();

app.use(cookieSession({
    name: 'comp1108',
    keys: ["/* secret sign keys */", "/* secret verify keys */"]
}));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));

// app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({extended: false}));
app.use(express.static(path.join(__dirname, 'public')));

app.set('view engine', 'html');

app.use('/', indexRouter);
app.use('/user', userRouter);
app.use('/chat', chatRouter);

app.use((req, res, next) => {
    const oldRedirect = res.redirect;
    res.redirect = function (...args) {
        if (req.session) {
            // redirecting after saving...
            req.session.save(() => Reflect.apply(oldRedirect, this, args))
        } else {
            Reflect.apply(oldRedirect, this, args);
        }
    }
});

let initialization = require("./initialization");
initialization.importMockData("./resources/db/mock_data.json", './resources/db/comp1108.sqlite');

module.exports = app;
