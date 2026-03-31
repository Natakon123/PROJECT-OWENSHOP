const mongoose = require('mongoose')

// 1. ออกแบบ Schema (เพิ่มฟิลด์ Stock และ Cost)
let productSchema = mongoose.Schema({
    name: { type: String, required: true },
    price: { type: Number, required: true },
    cost: { type: Number, default: 0 },       // ✅ เพิ่มต้นทุน เพื่อคำนวณกำไร
    stock: { type: Number, default: 0 },      // ✅ เพิ่มจำนวนสินค้าในคลัง
    image: String,
    description: String
})

// 2. สร้างและส่งออก Model
const Product = mongoose.model("Product", productSchema);
module.exports = Product;

// 3. ฟังก์ชันบันทึกข้อมูล (ปรับปรุงให้ใช้ async/await เพื่อความปลอดภัย)
module.exports.saveProduct = async function(data) {
    try {
        const newProduct = new Product(data);
        return await newProduct.save();
    } catch (err) {
        console.error("Error saving product:", err);
        throw err;
    }
}