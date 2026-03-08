# Booki Booki

Booki Booki คือแพลตฟอร์มแอปพลิเคชันสำหรับค้นหาและจองบริการช่างแต่งหน้าและช่างภาพแบบครบวงจร พัฒนาด้วย Vue 3 และ Ionic Framework เพื่อให้รองรับการใช้งานแบบ Cross-platform (Web, iOS, Android) พร้อมระบบฐานข้อมูลและแชทแบบ Real-time จาก Firebase

## ฟีเจอร์หลัก
ระบบมีการแบ่งผู้ใช้งานออกเป็น 3 บทบาทหลัก ได้แก่:

### 1. ลูกค้า 
* **ค้นหาและคัดกรอง:** ค้นหาช่างแต่งหน้าหรือช่างภาพ พร้อมระบบคัดกรอง  ตามประเภทบริการ, ช่วงราคา และจังหวัด
* **ระบบแชทแบบ Real-time:** พูดคุยสอบถามรายละเอียดกับช่างได้โดยตรง
* **ระบบการจองและชำระเงิน:** รับใบเสนอราคาจากช่าง, อัปโหลดหลักฐานการโอนเงิน และกดยืนยันเมื่อบริการเสร็จสิ้น
* **ระบบรีวิว:** สามารถให้คะแนน (1-5 ดาว) และเขียนรีวิวให้ช่างได้หลังจากงานเสร็จสิ้นแล้วเท่านั้น

### 2. ผู้ให้บริการ
* **โปรไฟล์ส่วนตัว:** แสดงภาพหน้าปก, รูปพอร์ตโฟลิโอ, คำแนะนำตัว, ราคาเริ่มต้น และสถิติ
* **การเสนอราคา:** สร้างและส่งใบเสนอราคาให้ลูกค้าผ่านช่องแชท พร้อมกำหนดวันที่ให้บริการและราคา
* **ระบบจัดการสถานะงาน:** ติดตามสถานะการชำระเงินของลูกค้า

### 3. ผู้ดูแลระบบ
* **Dashboard ภาพรวม:** ดูกราฟและสถิติจำนวนผู้ใช้งานทั้งหมดและจำนวนรีวิวในระบบ
* **จัดการผู้ใช้งาน:** สามารถเปลี่ยนบทบาทผู้ใช้และลบผู้ใช้ที่ทำผิดกฎ
* **จัดการเนื้อหา :** สามารถตรวจสอบและกดลบรีวิวที่ไม่เหมาะสมได้ทั้งจากหน้า Dashboard และหน้าโปรไฟล์ของช่างโดยตรง

## เทคโนโลยีที่ใช้งาน

### Frontend
* **Framework:** Vue 3 (Composition API)
* **UI/Mobile:** Ionic Framework (@ionic/vue)
* **Language:** TypeScript
* **Build Tool:** Vite
* **Routing:** Vue Router

### Backend & Database
* **Database:** Firebase Cloud Firestore (NoSQL)
* **Authentication:** Firebase Authentication
* **Image Hosting:** Cloudinary

### Deployment & DevOps
* **Containerization:** Docker & Docker Compose

## การติดตั้งและการใช้งาน

### ขั้นตอนการรันโปรเจกต์
1. โคลนโปรเจกต์ลงมาที่เครื่องของคุณ
```bash
   git clone https://github.com/nattaphat010447/Booking_Makeup_Artists_Photographers.git
```

2. เข้าไปที่โฟลเดอร์ `frontend` และติดตั้ง Dependencies:
```bash
   cd frontend
   npm install
```

3. สร้างไฟล์ `.env` ไว้ในโฟลเดอร์ `frontend` และกำหนดค่า Environment Variables ดังนี้:
```bash
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id

VITE_CLOUDINARY_CLOUD_NAME=your_cloudinary_name
VITE_CLOUDINARY_UPLOAD_PRESET=your_upload_preset
```

4. รัน Development Server:
```bash
npm run dev
```
