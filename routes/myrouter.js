const express = require('express');
const router = express.Router();
const bcrypt = require("bcryptjs");
const multer = require('multer');
const moment = require('moment');

// นำเข้าไฟล์เชื่อมต่อฐานข้อมูล
const connectDB = require("../config/db");

// นำเข้า Models
const Product = require('../models/products');
const Member = require('../models/members');
const Sale = require('../models/sales');
const Employee = require('../models/employees');

const title = "ITMI Shop";

// ✅ 1. Middleware: เช็คว่าล็อกอินหรือยัง? (รปภ. ตรวจบัตร)
function isLogin(req, res, next) {
    if (req.session.user) {
        return next(); // มีบัตร/มี Session ให้ผ่านไปได้
    }
    // ไม่มีบัตร ให้เด้งไปหน้า Login พร้อมเตือน
    res.send('<script>alert("กรุณาเข้าสู่ระบบก่อนใช้งาน"); window.location="/login";</script>');
}

// ✅ Middleware: สำหรับตรวจสอบสิทธิ์เจ้าของร้าน (เผื่อไว้ใช้งาน)
function isOwner(req, res, next) {
    if (req.session.user && req.session.user.role === 'owner') {
        return next();
    }
    res.status(403).send("สิทธิ์การเข้าถึงจำกัดเฉพาะเจ้าของร้าน");
}

// การตั้งค่า Multer
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, './public/images/products');
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + ".jpg");
    }
});
const upload = multer({ storage: storage });

// 🏠 หน้าแรก (ไม่ต้องล็อกอินก็ดูได้)
// 🏠 หน้าแรก (อัปเกรด: ค้นหาตามช่วงราคาได้แบบสัสๆ)
router.get("/", async (req, res) => {
    try {
        // 1. ดึงค่าจาก URL Query (เช่น /?minPrice=100&maxPrice=500)
        const { minPrice, maxPrice } = req.query;
        let query = {};

        // 2. สร้างเงื่อนไขการค้นหา (Logic การกรองราคา)
        if (minPrice || maxPrice) {
            query.price = {};
            if (minPrice) query.price.$gte = Number(minPrice); // มากกว่าหรือเท่ากับ
            if (maxPrice) query.price.$lte = Number(maxPrice); // น้อยกว่าหรือเท่ากับ
        }

        // 3. ค้นหาข้อมูลตามเงื่อนไข (ถ้าไม่มีราคามา มันจะหาทั้งหมดปกติ)
        const products = await Product.find(query);

        // 4. ส่งข้อมูลไปที่หน้า index.ejs
        res.render("index", {
            products: products,
            title: title,
            user: req.session.user || null,
            // ส่งค่ากลับไปโชว์ในช่อง Input เพื่อความสวยงามและใช้งานง่าย
            filters: { 
                minPrice: minPrice || "", 
                maxPrice: maxPrice || "" 
            }
        });
    } catch (error) {
        console.error("Search Error:", error);
        res.status(500).send("Server Error");
    }
});
// 📦 จัดการสินค้า (ต้องล็อกอิน)
router.get('/manage', isLogin, async (req, res) => {
    try {
        const products = await Product.find();
        res.render("manage", { 
            products: products, 
            title: "Manage Product", 
            user: req.session.user || null 
        });
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

// 👥 จัดการสมาชิก (ต้องล็อกอิน)
router.get('/members', isLogin, async (req, res) => {
    try {
        const members = await Member.find();
        res.render("members", { 
            members: members, 
            title: "Manage Members", 
            user: req.session.user || null 
        });
    } catch (error) {
        res.status(500).send("Server Error");
    }
});

// 👨‍💼 จัดการพนักงาน (ต้องล็อกอิน)
router.get('/employees', isLogin, async (req, res) => {
    try {
        const employees = await Employee.find();
        res.render('employees', { 
            employees: employees, 
            title: 'จัดการพนักงาน', 
            user: req.session.user || null 
        });
    } catch (error) {
        res.status(500).send("Server Error");
    }
});

// 🔑 อนุมัติพนักงาน (ต้องล็อกอิน)
router.get('/approve', isLogin, async (req, res) => {
    const users = await Employee.find({ status: 'pending' });
    res.render('approve', { 
        users: users, 
        title: "Approve Employee", 
        user: req.session.user || null 
    });
});

router.get('/approve/:id', isLogin, async (req, res) => {
    await Employee.findByIdAndUpdate(req.params.id, { status: 'approved' });
    res.redirect('/approve');
});

// 🔍 ค้นหาสินค้า (ไม่ต้องล็อกอิน)
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
        res.render("findResults", { 
            products, 
            title: "ผลการค้นหา", 
            user: req.session.user || null 
        });
    } catch (error) {
        res.status(500).send(error.message);
    }
});

// 🔐 ระบบ Login & Register (ห้ามใส่ isLogin)
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
    res.redirect("/welcome"); // ✅ ส่งไปหน้าต้อนรับก่อน
});

// ✅ เพิ่ม Route หน้า Welcome (ทางผ่าน)
router.get("/welcome", isLogin, (req, res) => {
    res.render("welcome", { user: req.session.user, title: "ยินดีต้อนรับ" });
});

router.get("/logout", (req, res) => {
    req.session.destroy(() => res.redirect("/login"));
});

// 📊 หน้า Dashboard (เวอร์ชันอัปเกรด: สรุปยอดขายแบบ Real-time)
router.get("/dashboard", isLogin, async (req, res) => {
    try {
        // 1. ดึงข้อมูลการขายทั้งหมดเพื่อมาคำนวณสถิติ
        const allSales = await Sale.find();
        
        let totalRevenue = 0;
        allSales.forEach(sale => {
            totalRevenue += (sale.totalPrice || 0);
        });

        // 2. นับจำนวนข้อมูลในหมวดต่างๆ
        const productCount = await Product.countDocuments();
        const memberCount = await Member.countDocuments();
        const orderCount = allSales.length;

const lowStockProducts = await Product.find({ 
    $or: [
        { stock: { $lte: 5 } },             // กรณีที่เป็นตัวเลข 5, 4, 3, 2, 1, 0
        { stock: null },                    // กรณีที่ค่าเป็น null
        { stock: { $exists: false } }       // กรณีที่ไม่มี field stock ใน document นั้น
    ]
}).sort({ stock: 1 });// sort 1 คือเรียงจากน้อยไปมาก (เอา 0 ขึ้นก่อน)
        // 4. ส่งข้อมูลทั้งหมดไปที่หน้า Dashboard.ejs
        res.render("dashboard", { 
            user: req.session.user,
            title: "Dashboard - ITMI Shop",
            stats: {
                revenue: totalRevenue.toLocaleString(), // ทำตัวเลขให้มี comma เช่น 10,000
                products: productCount,
                members: memberCount,
                orders: orderCount,
                lowStock: lowStockProducts
            }
        });
    } catch (error) {
        console.error("Dashboard Error:", error);
        res.status(500).send("เกิดข้อผิดพลาดในการโหลดข้อมูล Dashboard");
    }
    
});
// 🛒 ส่วนการขายสินค้า (ต้องล็อกอิน)
router.get("/sales/new", isLogin, async (req, res) => {
    const products = await Product.find();
    const members = await Member.find();
    res.render("sales/newsale", { 
        products, members, title: "ขายสินค้า", user: req.session.user || null 
    });
});

// 💰 บันทึกข้อมูลการขาย + ตัดสต็อก
router.post("/sales/insert", isLogin, async (req, res) => {
    try {
        const { product, member, quantity, paymentMethod, discount, date } = req.body;
        const productData = await Product.findById(product);
        if (!productData) return res.status(404).send("ไม่พบสินค้าในระบบ");

        const qty = parseInt(quantity) || 1;
        if (productData.stock < qty) {
            return res.send(`<script>alert("สินค้าไม่พอ! เหลือเพียง ${productData.stock} ชิ้น"); window.history.back();</script>`);
        }

        const price = productData.price;
        const disc = parseFloat(discount) || 0;
        const cost = productData.cost || (price * 0.7); 

        const newSale = new Sale({
            product: product,
            member: member || null,
            seller: req.session.user.id, 
            quantity: qty,
            //stock: stock,
            priceAtSale: price,
            costAtSale: cost,
            discount: disc,
            totalPrice: (price * qty) - disc,
            paymentMethod: paymentMethod || 'Cash',
            date: date ? new Date(date) : new Date()
        });

        const savedSale = await newSale.save();

        await Product.findByIdAndUpdate(product, { $inc: { stock: -qty } });

        res.redirect(`/sales/receipt/${savedSale._id}`);
    } catch (error) {
        res.status(500).send("เกิดข้อผิดพลาด: " + error.message);
    }
});

// 🧾 ใบเสร็จ (ต้องล็อกอิน)
router.get("/sales/receipt/:id", isLogin, async (req, res) => {
    try {
        const sale = await Sale.findById(req.params.id).populate("product").populate("member");
        if (!sale) return res.redirect("/sales/report");

        res.render("sales/receipt", { 
            sale, moment, title: "ใบเสร็จรับเงิน", user: req.session.user || null 
        });
    } catch (error) {
        res.status(500).send(error.message);
    }
});

// 📊 รายงาน (ต้องล็อกอิน)
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
            totalRevenue: 0,
            totalProfit: 0,
            totalDiscount: 0,
            countQR: 0,
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

// 📝 แก้ไขสินค้า (ต้องล็อกอิน)
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

// 🗑️ ลบสินค้า
router.get('/delete/:id', isLogin, async (req, res) => {
    try {
        await Product.findByIdAndDelete(req.params.id);
        res.redirect('/manage');
    } catch (error) {
        res.status(500).send("ไม่สามารถลบสินค้าได้: " + error.message);
    }
});

// 🗑️ ลบสมาชิก (ถ้ามีปุ่มลบในหน้า members.ejs)
router.get('/members/delete/:id', isLogin, async (req, res) => {
    try {
        await Member.findByIdAndDelete(req.params.id);
        res.redirect('/members');
    } catch (error) {
        res.status(500).send("ไม่สามารถลบสมาชิกได้");
    }
})
// ✅ 1. สำหรับเปิดหน้าฟอร์ม (GET)
router.get('/employees/add', isLogin, (req, res) => {
    // ส่งค่าที่จำเป็นไปให้ EJS ใช้งาน
    res.render('addEmployee', { 
        title: "เพิ่มพนักงานใหม่", 
        user: req.session.user, 
        message: "" 
    });
});

// ✅ 2. สำหรับรับข้อมูลจากฟอร์มบันทึกลง Database (POST)
router.post('/employees/add', isLogin, async (req, res) => {
    try {
        const { name, email, password, role } = req.body;
        
        // ตรวจสอบว่ามีอีเมลนี้ในระบบหรือยัง
        const existingUser = await Employee.findOne({ email });
        if (existingUser) {
            return res.send('<script>alert("อีเมลนี้ถูกใช้งานแล้ว"); window.history.back();</script>');
        }

        // เข้ารหัสรหัสผ่าน (bcrypt)
        const hashedPassword = await bcrypt.hash(password, 10);

        const newEmployee = new Employee({
            name: name,
            email: email,
            password: hashedPassword,
            role: role || 'staff',
            status: 'approved' // ตั้งค่าให้ใช้งานได้ทันที
        });

        await newEmployee.save();
        
        // บันทึกสำเร็จแล้วกลับไปหน้าแสดงรายชื่อพนักงาน
        res.redirect('/employees');
    } catch (error) {
        console.error(error);
  res.status(500).send("เกิดข้อผิดพลาด: " + error.message);
    }
});
// หน้าสมัครสมาชิก (ไม่ต้องล็อกอิน)
// หน้าสมัครสมาชิก (ไม่ต้องล็อกอิน)
router.get("/register", (req, res) => {
    // ส่ง old: {} ไปด้วยเพื่อไม่ให้ EJS ฟ้องว่าหาตัวแปร old ไม่เจอ
    res.render("register/regisindex", { 
        title: "สมัครสมาชิก", 
        user: null,
        old: {} // ป้องกัน Error <%= old.name %>
    });
});
// ระบบบันทึกการสมัครสมาชิก
router.post("/register", async (req, res) => {
    try {
        const { name, email, phone, password, confirmPassword, role } = req.body;

        // 1. เช็คว่ารหัสผ่านตรงกันไหม
        if (password !== confirmPassword) {
            return res.render("register/regisindex", {
                title: "สมัครสมาชิก",
                user: null,
                error: "รหัสผ่านไม่ตรงกัน",
                old: req.body // ส่งค่าเดิมกลับไปโชว์ใน Input
            });
        }

        // 2. เช็คว่าอีเมลซ้ำในระบบไหนหรือเปล่า
        const checkMember = await Member.findOne({ email });
        const checkEmployee = await Employee.findOne({ email });
        if (checkMember || checkEmployee) {
            return res.render("register/regisindex", {
                title: "สมัครสมาชิก",
                user: null,
                error: "อีเมลนี้ถูกใช้งานแล้ว",
                old: req.body
            });
        }

        // 3. เข้ารหัสรหัสผ่าน
        const hashedPassword = await bcrypt.hash(password, 10);

        // 4. บันทึกตาม Role ที่เลือก
        if (role === 'customer') {
            const newMember = new Member({
                name, email, phone, 
                password: hashedPassword, 
                role: 'member'
            });
            await newMember.save();
            res.send('<script>alert("สมัครสมาชิกสำเร็จ! กรุณาเข้าสู่ระบบ"); window.location="/login";</script>');
        } else {
            const newEmployee = new Employee({
                name, email, 
                password: hashedPassword, 
                role: 'staff',
                status: 'pending' // พนักงานต้องรออนุมัติก่อน
            });
            await newEmployee.save();
            res.send('<script>alert("ลงทะเบียนพนักงานสำเร็จ! กรุณารอเจ้าของร้านอนุมัติ"); window.location="/login";</script>');
        }

    } catch (error) {
        console.error(error);
        res.status(500).send("เกิดข้อผิดพลาดในการสมัครสมาชิก");
    }
});

const Coupon = require('../models/coupons');

// API สำหรับตรวจสอบคูปอง
router.post('/api/check-coupon', async (req, res) => {
    try {
        const { code } = req.body;
        const coupon = await Coupon.findOne({ code: code.toUpperCase(), active: true });

        if (!coupon) {
            return res.json({ success: false, message: 'ไม่พบคูปองหรือคูปองหมดอายุ' });
        }

        // เช็ควันหมดอายุ (ถ้ามี)
        if (coupon.expiryDate && new Date() > coupon.expiryDate) {
            return res.json({ success: false, message: 'คูปองนี้หมดอายุแล้ว' });
        }

        res.json({ 
            success: true, 
            discountType: coupon.discountType, 
            value: coupon.value 
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด' });
    }
});
router.get('/:id', async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);
        res.render("product", { product: product, title: "Product Detail", user: req.session.user || null });
    } catch (error) {
        res.redirect('/');
    }
});
module.exports = router;