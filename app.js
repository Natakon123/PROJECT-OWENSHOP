const express = require('express');
const app = express();
const path = require('path');
const session = require("express-session");
const myRouter = require('./routes/myrouter'); 
const Product = require('./models/products'); 

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// ✅ 1. อ่าน Data จาก Form
app.use(express.urlencoded({ extended: true })); 
app.use(express.json()); 

// ✅ 2. Static files
app.use(express.static(path.join(__dirname, 'public')));

// ✅ 3. Session
app.use(session({
    secret: "mysecretkey",
    resave: false,
    saveUninitialized: true
}));

// ✅ 4. Middleware สำหรับตัวแปร Global (ต้องวางไว้ก่อน Route เสมอ!)
// เพื่อให้ทุกหน้า (รวมถึง Navbar) รู้จักตัวแปร user, error, old
app.use((req, res, next) => {
    res.locals.user = req.session.user || null;
    res.locals.error = req.session.error || null;
    res.locals.old = req.session.old || {};
    
    delete req.session.error;
    delete req.session.old;
    next();
});

// ✅ 5. ระบบค้นหาอัจฉริยะ (Intelligence Search)
app.get('/find', async (req, res) => {
    try {
        const { name, minPrice, maxPrice, exclude, highPriceOnly, lowPriceOnly } = req.query;
        let query = {};
        let priceConditions = [];

        if (name) query.name = { $regex: name, $options: 'i' };
        if (minPrice) priceConditions.push({ price: { $gte: Number(minPrice) } });
        if (maxPrice) priceConditions.push({ price: { $lte: Number(maxPrice) } });
        
        if (highPriceOnly === 'on') priceConditions.push({ price: { $gt: 5000 } });
        if (lowPriceOnly === 'on') priceConditions.push({ price: { $lt: 2000 } });
        
        if (priceConditions.length > 0) query.$and = priceConditions;
        if (exclude) query.name = { ...(query.name || {}), $ne: exclude };

        const products = await Product.find(query); 
        
        // ส่งตัวแปรชื่อ products (พหูพจน์) ไปที่หน้า product.ejs
        res.render('product', { 
            products: products, 
            title: 'Search Results'
        });

    } catch (err) {
        console.error(err);
        res.status(500).send("Search Error: " + err.message);
    }
});

// ✅ 6. Router หลัก
app.use('/', myRouter);

app.listen(8080, () => {
    console.log("🚀 Server is running at http://localhost:8080");
});