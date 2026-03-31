const mongoose = require('mongoose')
const bcrypt = require("bcryptjs");

// ออกแบบ Schema
const MemberSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    phone: { type: String, required: true },
    password: { type: String, required: true },// เก็บรหัสผ่านที่เข้ารหัสแล้ว
});

// ✅ ตรวจสอบรหัสผ่าน
MemberSchema.methods.comparePassword = async function (password) {
    return await bcrypt.compare(password, this.password);
};

// สร้างและส่งออก Model
module.exports = mongoose.model("Member", MemberSchema);

// สร้างฟังก์ชันบันทึกข้อมูล
module.exports.saveMember = function(model, data){
    model.save(data);
}








