const mongoose = require("mongoose");

const salesSchema = new mongoose.Schema({
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
    member: { type: mongoose.Schema.Types.ObjectId, ref: 'Member' },
    // ✅ เพิ่มฟิลด์ seller เพื่อเก็บว่าพนักงานคนไหนเป็นคนขายบิลนี้
    seller: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' }, 
    quantity: { type: Number, default: 1 },
    priceAtSale: Number,   // ราคาขาย ณ ตอนนั้น
    costAtSale: Number,    // ต้นทุน ณ ตอนนั้น (เอาไว้คิดกำไร)
    discount: { type: Number, default: 0 },
    totalPrice: Number,    // (ราคา * จำนวน) - ส่วนลด
    paymentMethod: { type: String, enum: ['Cash', 'Transfer', 'QR'], default: 'Cash' },
    date: { type: Date, default: Date.now }
});

const Sale = mongoose.model("Sale", salesSchema);
module.exports = Sale;

// ฟังก์ชันช่วยบันทึกข้อมูล (ปรับเป็น async/await เพื่อความทันสมัย)
module.exports.saveSale = async function(data) {
    try {
        const newSale = new Sale(data);
        return await newSale.save();
    } catch (err) {
        console.error("Error saving sale:", err);
        throw err;
    }
};