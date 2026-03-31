// ใช้งาน Mongoose
const mongoose = require('mongoose')

// เชื่อมไปยัง MongoDB
const dbUrl = 'mongodb://localhost:27017/ITMISHOP'

mongoose.connect(dbUrl,{
   
}).catch(err=>console.error('❌ Connection Error:', err))

mongoose.connection.on('connected', () => console.log('✅ MongoDB Connected'));

process.on('SIGINT', async () => {
  await mongoose.connection.close();
  console.log('🔴 MongoDB connection closed');
  process.exit(0);
});


