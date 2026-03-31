วิธีการติดตั้งโปรแกรม

1.ตรวจสอบว่าเครื่องของคุณได้ติดตั้งซอฟต์แวร์เหล่านี้เรียบร้อยแล้ว
Node.js (แนะนำเวอร์ชัน 16.x ขึ้นไป)

MongoDB (จะใช้แบบติดตั้งในเครื่อง หรือ MongoDB Atlas ก็ได้) 

2. ติดตั้ง Library พิมพ์ npm install ใน terminal


3.การตั้งค่าฐานข้อมูล (Database Configuration)
ตรวจสอบไฟล์การเชื่อมต่อฐานข้อมูล (ปกติจะอยู่ใน app.js หรือไฟล์ .env)

หากใช้ Local MongoDB ตรวจสอบว่า Service ของ MongoDB กำลังทำงานอยู่

หากใช้ MongoDB Atlas อย่าลืมเปลี่ยน Connection String ให้เป็นของคุณเอง

4. หากติดตั้งเสร็จเรียบร้อยแล้ว ให้พิมพ์ npm start ใน terminal
5.เปิด Web Browser (Chrome, Edge ฯลฯ) แล้วไปที่ที่อยู่: localhost:8080
