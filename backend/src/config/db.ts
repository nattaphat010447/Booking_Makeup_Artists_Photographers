import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// ฟังก์ชันสำหรับ Test Connection แบบมี Retry
export const connectDB = async (retries = 5) => {
  while (retries > 0) {
    try {
      await pool.connect();
      console.log('✅ Database Connected Successfully');
      break; // สำเร็จแล้ว ให้ออกจาก Loop
    } catch (err) {
      retries -= 1;
      console.error(`❌ Database Connection Failed. Retrying in 3 seconds... (Retries left: ${retries})`);
      
      if (retries === 0) {
        console.error('🚨 Could not connect to database after multiple attempts. Exiting...');
        process.exit(1); // ถ้าลองครบ 5 รอบยังไม่ได้ ค่อยให้โปรแกรมปิดตัวเอง
      }
      
      // รอ 3 วินาทีก่อนลองเชื่อมต่อใหม่
      await new Promise(res => setTimeout(res, 3000));
    }
  }
};