const mongoose = require('mongoose');

const couponSchema = new mongoose.Schema({
    code: { 
        type: String, 
        unique: true, 
        required: true,
        uppercase: true // เก็บเป็นตัวพิมพ์ใหญ่ทั้งหมดเพื่อกันพลาด
    },
    discountType: { 
        type: String, 
        enum: ['amount', 'percent'], 
        default: 'amount' 
    },
    value: { 
        type: Number, 
        required: true 
    },
    active: { 
        type: Boolean, 
        default: true 
    },
    expiryDate: {
        type: Date
    }
});

module.exports = mongoose.model('Coupon', couponSchema);