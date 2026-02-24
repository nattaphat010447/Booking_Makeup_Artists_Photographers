import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { pool } from '../config/db';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_key';

// ==========================================
// Register
// ==========================================
export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password, full_name, phone, role } = req.body;

    // 1. เช็กว่าอีเมลนี้มีในระบบหรือยัง
    const userExists = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (userExists.rows.length > 0) {
      res.status(400).json({ message: 'อีเมลนี้ถูกใช้งานแล้ว' });
      return;
    }

    // 2. เข้ารหัสผ่าน (Hash Password)
    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);

    // 3. บันทึกข้อมูลลง Database
    // กำหนดให้ role เป็น 'customer' หรือ 'provider' (ค่า default คือ customer)
    const userRole = role === 'provider' ? 'provider' : 'customer';
    
    const newUser = await pool.query(
      `INSERT INTO users (email, password_hash, full_name, phone, role) 
       VALUES ($1, $2, $3, $4, $5) RETURNING id, email, full_name, role`,
      [email, password_hash, full_name, phone, userRole]
    );

    // 4. ถ้าสมัครเป็นช่าง ให้ไปสร้างโปรไฟล์เปล่าๆ ไว้ในตาราง provider_profiles ด้วย
    if (userRole === 'provider') {
      const { service_type } = req.body;
      await pool.query(
        `INSERT INTO provider_profiles (user_id, service_type) VALUES ($1, $2)`,
        [newUser.rows[0].id, service_type || 'makeup']
      );
    }

    res.status(201).json({
      message: 'สมัครสมาชิกสำเร็จ',
      user: newUser.rows[0]
    });

  } catch (error) {
    console.error('Register Error:', error);
    res.status(500).json({ message: 'เกิดข้อผิดพลาดจากเซิร์ฟเวอร์' });
  }
};

// ==========================================
// Login
// ==========================================
export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    // 1. ค้นหา User จากอีเมล
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (result.rows.length === 0) {
      res.status(400).json({ message: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง' });
      return;
    }

    const user = result.rows[0];

    // 2. ตรวจสอบรหัสผ่านว่าตรงกันไหม
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      res.status(400).json({ message: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง' });
      return;
    }

    // 3. สร้าง JWT Token
    const payload = {
      id: user.id,
      role: user.role
    };

    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' }); // Token มีอายุ 7 วัน

    // 4. ส่ง Token กลับไปให้ Frontend
    res.status(200).json({
      message: 'เข้าสู่ระบบสำเร็จ',
      token,
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        role: user.role
      }
    });

  } catch (error) {
    console.error('Login Error:', error);
    res.status(500).json({ message: 'เกิดข้อผิดพลาดจากเซิร์ฟเวอร์' });
  }
};
