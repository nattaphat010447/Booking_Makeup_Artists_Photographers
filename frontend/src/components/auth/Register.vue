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
const role = ref(''); // 'customer', 'makeup', 'photographer'

// ฟิลด์ Step 2 (ข้อมูลช่าง)
const portfolioImages = ref<(File | null)[]>([null, null, null, null, null, null]);
const portfolioPreviews = ref<(string | null)[]>([null, null, null, null, null, null]);
const priceStart = ref<number>(0);
const location = ref('');
const bio = ref('');
const specialty = ref('');

// ลิสต์จังหวัดชั่วคราว
const provinces = ['กระบี่', 'กาญจนบุรี', 'กาฬสินธุ์', 'กำแพงเพชร', 'ขอนแก่น', 'จันทบุรี', 'ฉะเชิงเทรา', 'ชลบุรี', 'ชัยนาท', 'ชัยภูมิ', 'ชุมพร', 'เชียงราย', 'เชียงใหม่', 'ตรัง', 'ตราด', 'ตาก', 'นครนายก', 'นครปฐม', 'นครพนม', 'นครราชสีมา', 'นครศรีธรรมราช', 'นครสวรรค์', 'นนทบุรี', 'นราธิวาส', 'น่าน', 'บึงกาฬ', 'บุรีรัมย์', 'ปทุมธานี', 'ประจวบคีรีขันธ์', 'ปราจีนบุรี', 'ปัตตานี', 'พระนครศรีอยุธยา', 'พะเยา', 'พังงา', 'พัทลุง', 'พิจิตร', 'พิษณุโลก', 'เพชรบุรี', 'เพชรบูรณ์', 'แพร่', 'ภูเก็ต', 'มหาสารคาม', 'มุกดาหาร', 'แม่ฮ่องสอน', 'ยโสธร', 'ยะลา', 'ร้อยเอ็ด', 'ระนอง', 'ระยอง', 'ราชบุรี', 'ลพบุรี', 'ลำปาง', 'ลำพูน', 'เลย', 'ศรีสะเกษ', 'สกลนคร', 'สงขลา', 'สตูล', 'สมุทรปราการ', 'สมุทรสงคราม', 'สมุทรสาคร', 'สระแก้ว', 'สระบุรี', 'สิงห์บุรี', 'สุโขทัย', 'สุพรรณบุรี', 'สุราษฎร์ธานี', 'สุรินทร์', 'หนองคาย', 'หนองบัวลำภู', 'อ่างทอง', 'อำนาจเจริญ', 'อุดรธานี', 'อุตรดิตถ์', 'อุทัยธานี', 'อุบลราชธานี', 'เทศบาลตำบลอุโมงค์', 'นครราชสีมา', 'กรุงเทพมหานคร'];

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
  <div class="auth-wrapper">
    <div class="signup-card">

      <!-- Title -->
      <h2 class="title">Sign up</h2>

      <form @submit.prevent="role === 'customer' || step === 2 ? handleRegister() : goToNextStep()">

        <!-- ================= STEP 1 ================= -->
        <div v-if="step === 1" class="form-group">

          <!-- Profile image -->
          <div class="profile-upload">
            <label class="avatar-box">
              <img v-if="profilePreview" :src="profilePreview" />
              <span v-else class="avatar-placeholder">+</span>
              <input type="file" accept="image/*" @change="handleProfileImage" hidden />
            </label>
          </div>

          <input v-model="fullName" type="text" placeholder="Name" required />
          <input v-model="email" type="email" placeholder="Email" required />
          <input v-model="phone" type="text" placeholder="Phone" required />

          <input v-model="password" type="password" placeholder="Password" required minlength="6"/>
          <input v-model="confirmPassword" type="password" placeholder="Confirm Password" required minlength="6"/>

          <select v-model="role" required>
            <!-- placeholder -->
            <option value="" disabled hidden>Select Role</option>
            <!-- choices -->
            <option value="customer">Customer</option>
            <option value="makeup">Makeup Artist</option>
            <option value="photographer">Photographer</option>
          </select>

          <button class="primary-btn" type="submit" :disabled="isLoading">
            <span v-if="isLoading">{{ loadingMessage }}</span>
            <span v-else>
              {{ role === 'makeup' || role === 'photographer'
                  ? 'Next'
                  : 'Create account' }}
            </span>
          </button>
        </div>

        <!-- ================= STEP 2 ================= -->
        <div v-if="step === 2" class="form-group">

          <button type="button" class="back-btn" @click="step = 1">← Back</button>

          <h3 class="sub-title">Provider Information</h3>

          <!-- portfolio -->
          <div class="portfolio-grid">
            <label
              v-for="index in 6"
              :key="index"
              class="portfolio-item"
            >
              <img
                v-if="portfolioPreviews[index-1]"
                :src="portfolioPreviews[index-1]!"
              />
              <span v-else>+</span>

              <input
                type="file"
                accept="image/*"
                hidden
                @change="(e)=>handlePortfolioImage(e,index-1)"
              />
            </label>
          </div>

          <input v-model="specialty" placeholder="Specialty" required />
          <input v-model="priceStart" type="number" placeholder="Start price" />

          <select v-model="location" required>
            <option value="" disabled>Select Province</option>
            <option v-for="prov in provinces" :key="prov">
              {{ prov }}
            </option>
          </select>

          <textarea v-model="bio" rows="3" placeholder="Short bio..." />

          <button class="primary-btn" type="button" @click="handleRegister" :disabled="isLoading">
            {{ isLoading ? loadingMessage : 'Create account' }}
          </button>
        </div>

      </form>

      <p class="signin-text">
        Already have an account?
        <router-link to="/login">Sign in</router-link>
      </p>

    </div>
  </div>
</template>

<style scoped>
.auth-wrapper {
  min-height: 100vh;
  background: #F8F4F0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.signup-card {
  width: 380px;
  background: #FFFFFF;
  padding: 40px;
  border-radius: 16px;
  box-shadow: 0 10px 25px rgba(0,0,0,0.08);
  text-align: center;
}

.title {
  font-size: 26px;
  font-weight: 600;
  margin-bottom: 25px;
  color: #3b2b26;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

input,
select,
textarea {
  border: none;
  border-bottom: 1px solid #c9c3bf;
  padding: 10px 4px;
  outline: none;
  font-size: 14px;
  background: transparent;
}

input:focus,
select:focus,
textarea:focus {
  border-color: #b8937f;
}

/* placeholder ของ input */
input::placeholder,
textarea::placeholder {
  color: #D9D9D9;
}

/* select placeholder */
select:invalid {
  color: #D9D9D9;
}

/* option จริง */
select option {
  color: #000;
}

.primary-btn {
  margin-top: 10px;
  background: #C89F8A;
  border: none;
  padding: 15px 100px; 
  border-radius: 10px;
  color: white;
  font-weight: 500;
  cursor: pointer;
  transition: 0.2s;
  width: fit-content;     
  align-self: center; 
}

.primary-btn:hover {
  background: #b8937f;
}

.avatar-box {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background: #f2f2f2;
  margin: auto;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  overflow: hidden;
}

.avatar-box img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.avatar-placeholder {
  font-size: 28px;
  color: #aaa;
}

.portfolio-grid {
  display: grid;
  grid-template-columns: repeat(3,1fr);
  gap: 8px;
}

.portfolio-item {
  aspect-ratio: 1;
  background: #f4f4f4;
  border-radius: 8px;
  display:flex;
  align-items:center;
  justify-content:center;
  cursor:pointer;
  overflow:hidden;
}

.portfolio-item img {
  width:100%;
  height:100%;
  object-fit:cover;
}

.back-btn {
  background:none;
  border:none;
  text-align:left;
  cursor:pointer;
  color:#777;
}

.signin-text {
  color: #2C1810;
  font-size: 14px;
  margin-top: 15px;
}

.signin-text a {
  color: #C89F8A;
  text-decoration: none;
  font-weight: 500;
}

.signin-text a:hover {
  opacity: 0.8;
  text-decoration: underline;
}
</style>