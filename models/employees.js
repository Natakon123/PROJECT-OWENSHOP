const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const employeeSchema = new mongoose.Schema({
    name: String,
    username: String,
    password: String,
    email: String,

    role: {
        type: String,
        enum: ['customer', 'staff', 'owner'],
        default: 'customer'
    },

    status: {
        type: String,
        enum: ['pending', 'approved'],
        default: 'approved' // ลูกค้าเข้าได้เลย
    }
});

// 🔐 เข้ารหัส password ก่อน save
employeeSchema.pre('save', async function(next){
    if(!this.isModified('password')) return next();
    this.password = await bcrypt.hash(this.password, 10);
    next();
});

module.exports = mongoose.model('Employee', employeeSchema);