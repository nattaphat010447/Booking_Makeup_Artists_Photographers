<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { auth, db } from '../../config/firebase';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';

// ================= State =================
const step = ref(1);
const isLoading = ref(false);
const loadingMessage = ref(''); // เพิ่ม state เพื่อบอกผู้ใช้ว่ากำลังทำอะไรอยู่
const router = useRouter();

// ฟิลด์ Step 1 (ข้อมูลพื้นฐาน)
const profileImage = ref<File | null>(null);
const profilePreview = ref<string | null>(null);
const email = ref('');
const password = ref('');
const confirmPassword = ref('');
const fullName = ref('');
const phone = ref('');
const role = ref('customer'); // 'customer', 'makeup', 'photographer'

// ฟิลด์ Step 2 (ข้อมูลช่าง)
const portfolioImages = ref<(File | null)[]>([null, null, null, null, null, null]);
const portfolioPreviews = ref<(string | null)[]>([null, null, null, null, null, null]);
const priceStart = ref<number>(0);
const location = ref('');
const bio = ref('');
const specialty = ref('');

// ลิสต์จังหวัดชั่วคราว
const provinces = ['กรุงเทพมหานคร', 'เชียงใหม่', 'ขอนแก่น', 'ชลบุรี', 'ภูเก็ต', 'นครราชสีมา'];

// ================= Functions =================

// จัดการเลือกรูปโปรไฟล์ (แค่พรีวิว ยังไม่อัปโหลด)
const handleProfileImage = (e: Event) => {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (file) {
    profileImage.value = file;
    profilePreview.value = URL.createObjectURL(file);
  }
};

// จัดการเลือกรูปพอร์ตฟอลิโอ (แค่พรีวิว ยังไม่อัปโหลด)
const handlePortfolioImage = (e: Event, index: number) => {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (file) {
    portfolioImages.value[index] = file;
    portfolioPreviews.value[index] = URL.createObjectURL(file);
  }
};

// ตรวจสอบรหัสผ่านก่อนไป Step 2
const goToNextStep = () => {
  if (password.value !== confirmPassword.value) {
    alert('รหัสผ่านไม่ตรงกัน กรุณาตรวจสอบอีกครั้ง');
    return;
  }
  step.value = 2;
};

// 🔴 ฟังก์ชันอัปโหลดไป Cloudinary ของจริง
const uploadToCloudinary = async (file: File | null): Promise<string> => {
  if (!file) return '';

  const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
  const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

  if (!cloudName || !uploadPreset) {
     console.error("Cloudinary config missing in .env");
     return '';
  }

  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', uploadPreset);

  try {
    const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
      method: 'POST',
      body: formData,
    });
    
    if (!response.ok) throw new Error('อัปโหลดรูปภาพล้มเหลว');
    
    const data = await response.json();
    return data.secure_url; // คืนค่า URL ภาพจาก Cloudinary
  } catch (error) {
    console.error('Cloudinary Error:', error);
    throw error;
  }
};

// ยืนยันการสมัครสมาชิก (Submit)
const handleRegister = async () => {
  if (password.value !== confirmPassword.value) {
    alert('รหัสผ่านไม่ตรงกัน');
    return;
  }

  isLoading.value = true;
  try {
    // --- 1. อัปโหลดรูปภาพทั้งหมดให้เสร็จก่อน ---
    loadingMessage.value = 'กำลังอัปโหลดรูปโปรไฟล์...';
    const profileUrl = await uploadToCloudinary(profileImage.value);

    let portfolioUrls: string[] = [];
    if (role.value !== 'customer') {
      loadingMessage.value = 'กำลังอัปโหลดผลงาน (Portfolio)...';
      // กรองเอาเฉพาะ index ที่มีไฟล์รูปจริงๆ แล้วอัปโหลดขนานกัน (Parallel) ช่วยให้เร็วขึ้น
      const validPortfolioFiles = portfolioImages.value.filter(file => file !== null) as File[];
      portfolioUrls = await Promise.all(
        validPortfolioFiles.map(file => uploadToCloudinary(file))
      );
    }

    // --- 2. สร้างบัญชีใน Firebase Auth ---
    loadingMessage.value = 'กำลังสร้างบัญชีผู้ใช้...';
    const userCred = await createUserWithEmailAndPassword(auth, email.value, password.value);
    const user = userCred.user;

    // --- 3. เตรียมข้อมูลหลัก ---
    loadingMessage.value = 'กำลังบันทึกข้อมูล...';
    const userData: any = {
      email: user.email,
      full_name: fullName.value,
      phone: phone.value,
      role: role.value === 'customer' ? 'customer' : 'provider', // จัดกลุ่ม
      profile_image: profileUrl,
      created_at: new Date()
    };

    // --- 4. ถ้าเป็นช่าง ให้เพิ่มข้อมูล provider_info ลงใน Document เดียวกัน ---
    if (role.value !== 'customer') {
      userData.provider_info = {
        service_type: role.value, // 'makeup' หรือ 'photographer'
		specialty: specialty.value,
        bio: bio.value,
        location: location.value,
        price_start: priceStart.value,
        rating_avg: 0,
        portfolios: portfolioUrls // เก็บเป็น Array ของลิงก์รูปภาพ
      };
    }

    // --- 5. บันทึกลง Firestore ---
    await setDoc(doc(db, 'users', user.uid), userData);

    alert('สมัครสมาชิกสำเร็จ!');
    router.push('/login');
    
  } catch (error: any) {
    alert('เกิดข้อผิดพลาด: ' + error.message);
  } finally {
    isLoading.value = false;
    loadingMessage.value = '';
  }
};
</script>

<template>
  <div class="auth-box">
    <h2>สมัครสมาชิก</h2>
    <form @submit.prevent="role === 'customer' || step === 2 ? handleRegister() : goToNextStep()">
      
      <div v-if="step === 1" class="step-content">
        
        <div class="profile-upload">
          <label>รูปโปรไฟล์:</label>
          <div class="preview-box">
            <img v-if="profilePreview" :src="profilePreview" alt="Profile" class="img-preview" />
            <span v-else>ยังไม่มีรูป</span>
          </div>
          <input type="file" accept="image/*" @change="handleProfileImage" />
        </div>

        <div>
          <label>ชื่อ-นามสกุล:</label>
          <input v-model="fullName" type="text" required placeholder="สมชาย ใจดี" />
        </div>
        <div>
          <label>อีเมล:</label>
          <input v-model="email" type="email" required placeholder="example@email.com" />
        </div>
        <div>
          <label>เบอร์โทรศัพท์:</label>
          <input v-model="phone" type="text" required placeholder="0812345678" />
        </div>
        <div>
          <label>รหัสผ่าน:</label>
          <input v-model="password" type="password" required minlength="6" />
        </div>
        <div>
          <label>ยืนยันรหัสผ่าน:</label>
          <input v-model="confirmPassword" type="password" required minlength="6" />
        </div>
        
        <div>
          <label>สมัครในฐานะ:</label>
          <select v-model="role">
            <option value="customer">ลูกค้าทั่วไป</option>
            <option value="makeup">ช่างแต่งหน้า</option>
            <option value="photographer">ช่างภาพ</option>
          </select>
        </div>

        <button type="submit" class="btn-primary" :disabled="isLoading">
          <span v-if="isLoading">{{ loadingMessage }}</span>
          <span v-else>{{ role === 'customer' ? 'ยืนยันการสมัคร' : 'ถัดไป' }}</span>
        </button>
      </div>

      <div v-if="step === 2" class="step-content">
        <button type="button" class="btn-back" @click="step = 1" :disabled="isLoading">← กลับ</button>
        <h3>ข้อมูลเพิ่มเติมสำหรับช่าง</h3>
        
        <label>รูปผลงาน (Portfolio) - สูงสุด 6 รูป:</label>
        <div class="portfolio-grid">
          <div v-for="index in 6" :key="index" class="portfolio-item">
            <label :for="'portfolio-' + index" class="upload-area">
              <img v-if="portfolioPreviews[index-1]" :src="portfolioPreviews[index-1]!" class="img-preview" />
              <span v-else>+</span>
            </label>
            <input :id="'portfolio-' + index" type="file" accept="image/*" class="hidden" @change="(e) => handlePortfolioImage(e, index-1)" :disabled="isLoading" />
          </div>
        </div>
		
		<div>
          <label>ประเภทงานที่รับ (เช่น Cosplay Makeup, ถ่ายรูปรับปริญญา):</label>
          <input v-model="specialty" type="text" required placeholder="ระบุประเภทงานที่ถนัด..." :disabled="isLoading" />
        </div>

        <div>
          <label>ราคาเริ่มต้น (บาท):</label>
          <input v-model="priceStart" type="number" min="0" required :disabled="isLoading" />
        </div>

        <div>
          <label>จังหวัดที่รับงาน (หลัก):</label>
          <select v-model="location" required :disabled="isLoading">
            <option value="" disabled>-- เลือกจังหวัด --</option>
            <option v-for="prov in provinces" :key="prov" :value="prov">{{ prov }}</option>
          </select>
        </div>

        <div>
          <label>Bio (แนะนำตัวสั้นๆ):</label>
          <textarea v-model="bio" rows="3" placeholder="ประสบการณ์, สไตล์งาน, เงื่อนไขเบื้องต้น..." :disabled="isLoading"></textarea>
        </div>

        <button type="button" class="btn-primary" @click="handleRegister" :disabled="isLoading">
          {{ isLoading ? loadingMessage : 'ยืนยันการสมัคร' }}
        </button>
      </div>

    </form>
  </div>
</template>

