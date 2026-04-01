const express = require('express');
const router = express.Router();
const bcrypt = require("bcryptjs");
const multer = require('multer');
const moment = require('moment');

// 1. [SECTION] นำเข้าไฟล์เชื่อมต่อและ Models
const connectDB = require("../config/db");
const Product = require('../models/products');
const Member = require('../models/members');
const Sale = require('../models/sales');
const Employee = require('../models/employees');
const Coupon = require('../models/coupons');

const title = "ITMI Shop";

// 2. [SECTION] การตั้งค่า Multer (Upload)
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, './public/images/products');
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + ".jpg");
    }
});
const upload = multer({ storage: storage });

// 3. [SECTION] Middleware (ระบบตรวจสอบสิทธิ์)
function isLogin(req, res, next) {
    if (req.session.user) {
        return next();
    }
    res.send('<script>alert("กรุณาเข้าสู่ระบบก่อนใช้งาน"); window.location="/login";</script>');
}

function isOwner(req, res, next) {
    if (req.session.user && req.session.user.role === 'owner') {
        return next();
    }
    res.status(403).send("สิทธิ์การเข้าถึงจำกัดเฉพาะเจ้าของร้าน");
}

// 4. [SECTION] ระบบ Login & Register (Public Access)
router.get("/login", (req, res) => {
    res.render("login", { message: req.session.message, user: null });
});

router.post("/login", async (req, res) => {
    const { email, password } = req.body;
    let user = await Member.findOne({ email });
    if (!user) user = await Employee.findOne({ email });

    if (!user || !(await bcrypt.compare(password, user.password))) {
        req.session.message = "อีเมลหรือรหัสผ่านไม่ถูกต้อง";
        return res.redirect("/login");
    }

    if (user.status === 'pending') {
        return res.send('<script>alert("รออนุมัติการใช้งาน"); window.location="/login";</script>');
    }

    req.session.user = { id: user._id, name: user.name, email: user.email, role: user.role };
    res.redirect("/welcome");
});

router.get("/register", (req, res) => {
    res.render("register/regisindex", { 
        title: "สมัครสมาชิก", 
        user: null,
        old: {} 
    });
});

router.post("/register", async (req, res) => {
    try {
        const { name, email, phone, password, confirmPassword } = req.body;
        if (password !== confirmPassword) {
            return res.render("register/regisindex", {
                title: "สมัครสมาชิก",
                user: null,
                error: "รหัสผ่านไม่ตรงกัน",
                old: req.body
            });
        }
        const checkMember = await Member.findOne({ email });
        if (checkMember) {
            return res.render("register/regisindex", {
                title: "สมัครสมาชิก",
                user: null,
                error: "อีเมลนี้ถูกใช้งานแล้ว",
                old: req.body
            });
        }
        const hashedPassword = await bcrypt.hash(password, 10);
        const newMember = new Member({
            name, email, phone, password: hashedPassword, role: 'member'
        });
        await newMember.save();
        res.send('<script>alert("สมัครสมาชิกสำเร็จ! เข้าสู่ระบบได้ทันที"); window.location="/login";</script>');
    } catch (error) {
        console.error(error);
        res.status(500).send("เกิดข้อผิดพลาดในการสมัครสมาชิก");
    }
});

router.get("/welcome", isLogin, (req, res) => {
    res.render("welcome", { user: req.session.user, title: "ยินดีต้อนรับ" });
});

router.get("/logout", (req, res) => {
    req.session.destroy(() => res.redirect("/login"));
});

// 5. [SECTION] หน้าแรกและการค้นหาสินค้า (Public Access)
router.get("/", async (req, res) => {
    try {
        const { minPrice, maxPrice } = req.query;
        let query = {};
        if (minPrice || maxPrice) {
            query.price = {};
            if (minPrice) query.price.$gte = Number(minPrice);
            if (maxPrice) query.price.$lte = Number(maxPrice);
        }
        const products = await Product.find(query);
        res.render("index", {
            products: products,
            title: title,
            user: req.session.user || null,
            filters: { minPrice: minPrice || "", maxPrice: maxPrice || "" }
        });
    } catch (error) {
        console.error("Search Error:", error);
        res.status(500).send("Server Error");
    }
});

router.get("/findindex", (req, res) => {
    res.render('find', { title: "ค้นหา", user: req.session.user || null });
});

router.get("/find", async (req, res) => {
    try {
        let query = {};
        if (req.query.name) query.name = { $eq: req.query.name };
        if (req.query.minPrice) query.price = { ...query.price, $gte: parseInt(req.query.minPrice) };
        if (req.query.maxPrice) query.price = { ...query.price, $lte: parseInt(req.query.maxPrice) };
        const products = await Product.find(query);
        res.render("findResults", { products, title: "ผลการค้นหา", user: req.session.user || null });
    } catch (error) {
        res.status(500).send(error.message);
    }
});

// 6. [SECTION] ระบบจัดการสินค้า (Inventory Management)
router.get('/manage', isLogin, async (req, res) => {
    try {
        const products = await Product.find();
        res.render("manage", { products: products, title: "Manage Product", user: req.session.user || null });
    } catch (error) {
        res.status(500).send("Server Error");
    }
});

router.get('/addForm', isLogin, (req, res) => {
    res.render('form', { title: "Add New Product", user: req.session.user || null });
});

router.post('/insert', isLogin, upload.single("image"), async (req, res) => {
    try {
        const newProduct = new Product({
            name: req.body.name,
            price: req.body.price,
            cost: req.body.cost || 0,
            stock: req.body.stock || 0,
            image: req.file ? req.file.filename : "default.jpg",
            description: req.body.description
        });
        await newProduct.save();
        res.redirect('/manage');
    } catch (error) {
        res.status(500).send(error.message);
    }
});

router.post('/edit', isLogin, async (req, res) => {
    try {
        const edit_id = req.body.id;
        const product = await Product.findById(edit_id);
        res.render('edit', { item: product, title: "แก้ไขข้อมูลสินค้า", user: req.session.user || null });
    } catch (error) {
        res.status(500).send("ไม่พบข้อมูลสินค้า");
    }
});

router.post('/update', isLogin, upload.single("image"), async (req, res) => {
    try {
        const update_id = req.body.id;
        let data = {
            name: req.body.name,
            price: req.body.price,
            cost: req.body.cost,
            stock: req.body.stock,
            description: req.body.description
        };
        if (req.file) data.image = req.file.filename;
        await Product.findByIdAndUpdate(update_id, data);
        res.redirect('/manage');
    } catch (error) {
        res.status(500).send(error.message);
    }
});

router.get('/delete/:id', isLogin, async (req, res) => {
    try {
        await Product.findByIdAndDelete(req.params.id);
        res.redirect('/manage');
    } catch (error) {
        res.status(500).send("ไม่สามารถลบสินค้าได้: " + error.message);
    }
});

// 7. [SECTION] ระบบจัดการสมาชิกและพนักงาน (CRM & HR)
router.get('/members', isLogin, async (req, res) => {
    try {
        const members = await Member.find();
        res.render("members", { members: members, title: "Manage Members", user: req.session.user || null });
    } catch (error) {
        res.status(500).send("Server Error");
    }
});

router.get('/members/delete/:id', isLogin, async (req, res) => {
    try {
        await Member.findByIdAndDelete(req.params.id);
        res.redirect('/members');
    } catch (error) {
        res.status(500).send("ไม่สามารถลบสมาชิกได้");
    }
})

router.get('/employees', isLogin, async (req, res) => {
    try {
        const employees = await Employee.find();
        res.render('employees', { employees: employees, title: 'จัดการพนักงาน', user: req.session.user || null });
    } catch (error) {
        res.status(500).send("Server Error");
    }
});

router.get('/employees/add', isLogin, (req, res) => {
    res.render('addEmployee', { title: "เพิ่มพนักงานใหม่", user: req.session.user, message: "" });
});

router.post('/employees/add', isLogin, async (req, res) => {
    try {
        const { name, email, password, role } = req.body;
        const existingUser = await Employee.findOne({ email });
        if (existingUser) {
            return res.send('<script>alert("อีเมลนี้ถูกใช้งานแล้ว"); window.history.back();</script>');
        }
        const hashedPassword = await bcrypt.hash(password, 10);
        const newEmployee = new Employee({
            name: name, email: email, password: hashedPassword, role: role || 'staff', status: 'approved'
        });
        await newEmployee.save();
        res.redirect('/employees');
    } catch (error) {
        console.error(error);
        res.status(500).send("เกิดข้อผิดพลาด: " + error.message);
    }
});

router.get('/approve', isLogin, async (req, res) => {
    const users = await Employee.find({ status: 'pending' });
    res.render('approve', { users: users, title: "Approve Employee", user: req.session.user || null });
});

router.get('/approve/:id', isLogin, async (req, res) => {
    await Employee.findByIdAndUpdate(req.params.id, { status: 'approved' });
    res.redirect('/approve');
});

// 8. [SECTION] ระบบรถเข็น (Shopping Cart)
router.get('/cart/add/:id', (req, res) => {
    const productId = req.params.id;
    if (!req.session.cart) req.session.cart = [];
    const existing = req.session.cart.find(item => item.productId == productId);
    if (existing) {
        existing.qty += 1;
    } else {
        req.session.cart.push({ productId, qty: 1 });
    }
    res.redirect('/cart');
});

router.get('/cart', async (req, res) => {
    try {
        const cart = req.session.cart || [];
        const productIds = cart.map(item => item.productId);
        const products = await Product.find({ _id: { $in: productIds } });
        const cartItems = cart.map((item, index) => {
            const product = products.find(p => p._id.toString() === item.productId);
            if (!product) return null;
            return { ...product.toObject(), qty: item.qty, index: index };
        }).filter(item => item !== null);
        const totalPrice = cartItems.reduce((sum, item) => sum + (item.price * item.qty), 0);
        res.render('cart', { cart: cartItems, totalPrice, title: "Your Premium Bag", user: req.session.user || null });
    } catch (err) {
        res.redirect('/');
    }
});

router.get('/cart/remove/:index', (req, res) => {
    if (req.session.cart) req.session.cart.splice(req.params.index, 1);
    res.redirect('/cart');
});

// 9. [SECTION] ระบบการขาย (Sales & POS)
router.get("/sales/new", isLogin, async (req, res) => {
    const products = await Product.find();
    const members = await Member.find();
    res.render("sales/newsale", { products, members, title: "ขายสินค้า", user: req.session.user || null });
});

router.get('/newsale', async (req, res) => {
    try {
        const products = await Product.find({});
        const members = await Member.find({});
        const selectedProductId = req.query.product_id || null;
        res.render('sales/new', { products, members, selectedProductId });
    } catch (err) {
        res.status(500).send("Error loading POS");
    }
});

router.post('/sales/pos-from-cart', isLogin, async (req, res) => {
    try {
        let ids = req.body['productIds[]'] || req.body.productIds;
        if (!ids) return res.redirect('/cart');
        if (!Array.isArray(ids)) ids = [ids];
        const selectedProducts = await Product.find({ _id: { $in: ids } });
        const members = await Member.find({});
        const products = await Product.find({});
        res.render('sales/newsale', { 
            title: "Transaction", user: req.session.user, members, products, selectedProducts 
        });
    } catch (err) {
        res.redirect('/cart');
    }
});

router.post("/sales/insert", isLogin, async (req, res) => {
    try {
        const { member, paymentMethod, discount, items } = req.body;
        const itemList = Object.values(items);
        let totalBeforeDiscount = 0;
        for (let item of itemList) {
            const p = await Product.findById(item.product);
            if (p) totalBeforeDiscount += (p.price * (parseInt(item.quantity) || 1));
        }
        const discountPercent = parseFloat(discount) || 0;
        const totalDiscountBaht = (totalBeforeDiscount * discountPercent) / 100;
        const discountPerItem = totalDiscountBaht / itemList.length;
        let lastSavedSaleId = "";

        for (let item of itemList) {
            const productData = await Product.findById(item.product);
            if (!productData) continue;
            const qty = parseInt(item.quantity) || 1;
            const price = productData.price;
            await Product.findByIdAndUpdate(item.product, { $inc: { stock: -qty } });
            const newSale = new Sale({
                product: item.product,
                member: member || null,
                seller: req.session.user.id,
                quantity: qty,
                priceAtSale: price,
                costAtSale: productData.cost || (price * 0.7),
                discount: discountPerItem,
                totalPrice: (price * qty) - discountPerItem,
                paymentMethod: paymentMethod || 'Cash',
                date: new Date()
            });
            const saved = await newSale.save();
            lastSavedSaleId = saved._id;
        }
        req.session.cart = [];
        res.redirect(`/sales/receipt/${lastSavedSaleId}`);
    } catch (error) {
        res.status(500).send(error.message);
    }
});

router.post('/api/check-coupon', async (req, res) => {
    try {
        const { code } = req.body;
        const coupon = await Coupon.findOne({ code: code.toUpperCase(), active: true });
        if (!coupon) return res.json({ success: false, message: 'ไม่พบคูปองหรือคูปองหมดอายุ' });
        if (coupon.expiryDate && new Date() > coupon.expiryDate) {
            return res.json({ success: false, message: 'คูปองนี้หมดอายุแล้ว' });
        }
        res.json({ success: true, discountType: coupon.discountType, value: coupon.value });
    } catch (error) {
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด' });
    }
});

// 10. [SECTION] สรุปยอดและรายงาน (Analytics & Dashboard)
router.get("/dashboard", isLogin, async (req, res) => {
    try {
        const allSales = await Sale.find();
        let totalRevenue = 0;
        allSales.forEach(sale => { totalRevenue += (sale.totalPrice || 0); });
        const productCount = await Product.countDocuments();
        const memberCount = await Member.countDocuments();
        const orderCount = allSales.length;
        const lowStockProducts = await Product.find({ 
            $or: [{ stock: { $lte: 5 } }, { stock: null }, { stock: { $exists: false } }]
        }).sort({ stock: 1 });
        res.render("dashboard", { 
            user: req.session.user,
            title: "Dashboard - ITMI Shop",
            stats: {
                revenue: totalRevenue.toLocaleString(),
                products: productCount,
                members: memberCount,
                orders: orderCount,
                lowStock: lowStockProducts
            }
        });
    } catch (error) {
        res.status(500).send("เกิดข้อผิดพลาดในการโหลดข้อมูล Dashboard");
    }
});

router.get("/sales/receipt/:id", isLogin, async (req, res) => {
    try {
        const sale = await Sale.findById(req.params.id).populate("product").populate("member");
        if (!sale) return res.redirect("/sales/report");
        res.render("sales/receipt", { sale, moment, title: "ใบเสร็จรับเงิน", user: req.session.user || null });
    } catch (error) {
        res.status(500).send(error.message);
    }
});

router.get("/sales/report", isLogin, async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        let filter = {};
        if (startDate && endDate) {
            filter.date = { 
                $gte: moment(startDate).startOf('day').toDate(), 
                $lte: moment(endDate).endOf('day').toDate() 
            };
        }
        const sales = await Sale.find(filter).populate("product").populate("member").sort({ date: -1 });
        let stats = {
            totalRevenue: 0, totalProfit: 0, totalDiscount: 0, countQR: 0,
            paymentStats: { Cash: 0, Transfer: 0, QR: 0 }
        };
        sales.forEach(sale => {
            stats.totalRevenue += (sale.totalPrice || 0);
            stats.totalDiscount += (sale.discount || 0);
            const profit = (sale.priceAtSale * sale.quantity) - (sale.costAtSale * sale.quantity) - sale.discount;
            stats.totalProfit += profit;
            if (sale.paymentMethod && stats.paymentStats.hasOwnProperty(sale.paymentMethod)) {
                stats.paymentStats[sale.paymentMethod] += sale.totalPrice;
                if (sale.paymentMethod === 'QR') stats.countQR += sale.totalPrice;
            }
        });
        res.render("sales/report", { 
            sales, stats, startDate: startDate || "", endDate: endDate || "", moment,
            title: "รายงานการขายวิเคราะห์",
            user: req.session.user || null 
        });
    } catch (error) {
        res.status(500).send("เกิดข้อผิดพลาดในการดึงรายงาน");
    }
});

// 11. [SECTION] สินค้ารายละเอียด (Dynamic Route)
router.get('/:id', async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);
        res.render("product", { product: product, title: "Product Detail", user: req.session.user || null });
    } catch (error) {
        res.redirect('/');
    }
});

module.exports = router;