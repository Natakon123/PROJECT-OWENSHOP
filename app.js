const express = require('express');
const app = express();
const path = require('path');
const session = require("express-session");
const myRouter = require('./routes/myrouter'); 

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// ✅ 1. ตั้งค่าการอ่าน Data จาก Form (เอาแค่บรรทัดเดียว และต้องเป็น true)
app.use(express.urlencoded({ extended: true })); 
app.use(express.json()); // เผื่อไว้รับค่าแบบ JSON API ในอนาคต

// ✅ 2. Static files
app.use(express.static(path.join(__dirname, 'public')));

// ✅ 3. Session
app.use(session({
    secret: "mysecretkey",
    resave: false,
    saveUninitialized: true
}));

// ✅ 4. Middleware สำหรับตัวแปร Global
app.use((req, res, next) => {
    res.locals.user = req.session.user || null;
    res.locals.error = req.session.error;
    res.locals.old = req.session.old || {};
    
    // ล้างค่าหลังจากส่งไปหน้า View แล้ว
    delete req.session.error;
    delete req.session.old;
    next();
});

// ✅ 5. Router (ต้องอยู่หลัง middleware และ urlencoded เสมอ)
app.use('/', myRouter);

app.listen(8080, () => {
    console.log("🚀 Starting server at port: 8080");
});