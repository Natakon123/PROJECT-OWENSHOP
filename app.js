const express = require('express');
const app = express();
const path = require('path');
const myRouter = require('./routes/myrouter'); // นำเข้า myrouter.js

const session = require("express-session");

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
app.use(express.urlencoded({ extended: false }));

app.use(session({
    secret: "mysecretkey",
    resave: false,
    saveUninitialized: true
}));

app.use((req, res, next) => {
    res.locals.user = req.session.user;
    res.locals.error = req.session.error;
    res.locals.old = req.session.old || {};
    delete req.session.error;
    delete req.session.old;
    next();
});

const myrouter = require('./routes/myrouter');
app.use('/', myrouter);
app.use(express.static(path.join(__dirname, 'public')));

app.use(myRouter);  // ใช้ myrouter.js

app.listen(8080, () => {
    console.log("🚀 Starting server at port: 8080");
});
app.use(session({
    secret: 'possecret',
    resave: false,
    saveUninitialized: true
}));
app.use((req, res, next) => {
    res.locals.user = req.session.user || null;
    next();
});



