<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { auth, db } from '../../config/firebase';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';

import { 
  IonPage, 
  IonContent, 
  IonInput, 
  IonSelect, 
  IonSelectOption, 
  IonTextarea, 
  IonButton, 
  IonSpinner 
} from '@ionic/vue';

// ================= State =================
const step = ref(1);
const isLoading = ref(false);
const loadingMessage = ref(''); 
const router = useRouter();

const profileImage = ref<File | null>(null);
const profilePreview = ref<string | null>(null);
const email = ref('');
const password = ref('');
const confirmPassword = ref('');
const fullName = ref('');
const phone = ref('');
const role = ref(''); 

const portfolioImages = ref<(File | null)[]>([null, null, null, null, null, null]);
const portfolioPreviews = ref<(string | null)[]>([null, null, null, null, null, null]);
const priceStart = ref<number>(0);
const location = ref('');
const bio = ref('');
const specialty = ref('');

const provinces = ['กระบี่', 'กาญจนบุรี', 'กาฬสินธุ์', 'กำแพงเพชร', 'ขอนแก่น', 'จันทบุรี', 'ฉะเชิงเทรา', 'ชลบุรี', 'ชัยนาท', 'ชัยภูมิ', 'ชุมพร', 'เชียงราย', 'เชียงใหม่', 'ตรัง', 'ตราด', 'ตาก', 'นครนายก', 'นครปฐม', 'นครพนม', 'นครราชสีมา', 'นครศรีธรรมราช', 'นครสวรรค์', 'นนทบุรี', 'นราธิวาส', 'น่าน', 'บึงกาฬ', 'บุรีรัมย์', 'ปทุมธานี', 'ประจวบคีรีขันธ์', 'ปราจีนบุรี', 'ปัตตานี', 'พระนครศรีอยุธยา', 'พะเยา', 'พังงา', 'พัทลุง', 'พิจิตร', 'พิษณุโลก', 'เพชรบุรี', 'เพชรบูรณ์', 'แพร่', 'ภูเก็ต', 'มหาสารคาม', 'มุกดาหาร', 'แม่ฮ่องสอน', 'ยโสธร', 'ยะลา', 'ร้อยเอ็ด', 'ระนอง', 'ระยอง', 'ราชบุรี', 'ลพบุรี', 'ลำปาง', 'ลำพูน', 'เลย', 'ศรีสะเกษ', 'สกลนคร', 'สงขลา', 'สตูล', 'สมุทรปราการ', 'สมุทรสงคราม', 'สมุทรสาคร', 'สระแก้ว', 'สระบุรี', 'สิงห์บุรี', 'สุโขทัย', 'สุพรรณบุรี', 'สุราษฎร์ธานี', 'สุรินทร์', 'หนองคาย', 'หนองบัวลำภู', 'อ่างทอง', 'อำนาจเจริญ', 'อุดรธานี', 'อุตรดิตถ์', 'อุทัยธานี', 'อุบลราชธานี', 'กรุงเทพมหานคร'];

// ================= Functions =================
const handleProfileImage = (e: Event) => {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (file) {
    profileImage.value = file;
    profilePreview.value = URL.createObjectURL(file);
  }
};

const handlePortfolioImage = (e: Event, index: number) => {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (file) {
    portfolioImages.value[index] = file;
    portfolioPreviews.value[index] = URL.createObjectURL(file);
  }
};

const goToNextStep = () => {
  if (password.value !== confirmPassword.value) {
    alert('รหัสผ่านไม่ตรงกัน กรุณาตรวจสอบอีกครั้ง');
    return;
  }
  step.value = 2;
};

const uploadToCloudinary = async (file: File | null): Promise<string> => {
  if (!file) return '';
  const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
  const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

  if (!cloudName || !uploadPreset) return '';

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
    return data.secure_url; 
  } catch (error) {
    throw error;
  }
};

const handleRegister = async () => {
  if (password.value !== confirmPassword.value) {
    alert('รหัสผ่านไม่ตรงกัน');
    return;
  }

  isLoading.value = true;
  try {
    loadingMessage.value = 'กำลังอัปโหลดรูปโปรไฟล์...';
    const profileUrl = await uploadToCloudinary(profileImage.value);

    let portfolioUrls: string[] = [];
    if (role.value !== 'customer') {
      loadingMessage.value = 'กำลังอัปโหลดผลงาน...';
      const validPortfolioFiles = portfolioImages.value.filter(file => file !== null) as File[];
      portfolioUrls = await Promise.all(
        validPortfolioFiles.map(file => uploadToCloudinary(file))
      );
    }

    loadingMessage.value = 'กำลังสร้างบัญชีผู้ใช้...';
    const userCred = await createUserWithEmailAndPassword(auth, email.value, password.value);
    const user = userCred.user;

    loadingMessage.value = 'กำลังบันทึกข้อมูล...';
    const userData: any = {
      email: user.email,
      full_name: fullName.value,
      phone: phone.value,
      role: role.value === 'customer' ? 'customer' : 'provider',
      profile_image: profileUrl,
      created_at: new Date()
    };

    if (role.value !== 'customer') {
      userData.provider_info = {
        service_type: role.value,
        specialty: specialty.value,
        bio: bio.value,
        location: location.value,
        price_start: priceStart.value,
        rating_avg: 0,
        portfolios: portfolioUrls 
      };
    }

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
  <ion-page>
    <ion-content>
      <div class="auth-wrapper">
        <div class="signup-card">

          <h2 class="title">Sign up</h2>

          <form @submit.prevent="role === 'customer' || step === 2 ? handleRegister() : goToNextStep()">

            <div v-if="step === 1" class="form-group">
              
              <div class="profile-upload">
                <label class="avatar-box">
                  <img v-if="profilePreview" :src="profilePreview" />
                  <span v-else class="avatar-placeholder">+</span>
                  <input type="file" accept="image/*" @change="handleProfileImage" hidden />
                </label>
              </div>

              <ion-input v-model="fullName" type="text" placeholder="Name" class="custom-ion-input" required></ion-input>
              <ion-input v-model="email" type="email" placeholder="Email" class="custom-ion-input" required></ion-input>
              <ion-input v-model="phone" type="tel" placeholder="Phone" class="custom-ion-input" required></ion-input>

              <ion-input v-model="password" type="password" placeholder="Password" class="custom-ion-input" required minlength="6"></ion-input>
              <ion-input v-model="confirmPassword" type="password" placeholder="Confirm Password" class="custom-ion-input" required minlength="6"></ion-input>

              <ion-select v-model="role" placeholder="Select Role" class="custom-ion-select" interface="popover" required>
                <ion-select-option value="customer">Customer</ion-select-option>
                <ion-select-option value="makeup">Makeup Artist</ion-select-option>
                <ion-select-option value="photographer">Photographer</ion-select-option>
              </ion-select>

              <ion-button type="submit" class="ionic-primary-btn" :disabled="isLoading" style="--background: #C89F8A;">
                <div v-if="isLoading" class="loading-content">
                  <ion-spinner name="crescent" class="small-spinner"></ion-spinner>
                  <span>{{ loadingMessage }}</span>
                </div>
                <span v-else>
                  {{ role === 'makeup' || role === 'photographer' ? 'Next' : 'Create account' }}
                </span>
              </ion-button>
            </div>

            <div v-if="step === 2" class="form-group">

              <button type="button" class="back-btn" @click="step = 1">← Back</button>
              <h3 class="sub-title">Provider Information</h3>

              <div class="portfolio-grid">
                <label v-for="index in 6" :key="index" class="portfolio-item">
                  <img v-if="portfolioPreviews[index-1]" :src="portfolioPreviews[index-1]!" />
                  <span v-else>+</span>
                  <input type="file" accept="image/*" hidden @change="(e)=>handlePortfolioImage(e,index-1)" />
                </label>
              </div>

              <ion-input v-model="specialty" placeholder="Specialty" class="custom-ion-input" required></ion-input>
              <ion-input v-model="priceStart" type="number" placeholder="Start price" class="custom-ion-input"></ion-input>

              <ion-select v-model="location" placeholder="Select Province" class="custom-ion-select" interface="popover" required>
                <ion-select-option v-for="prov in provinces" :key="prov" :value="prov">{{ prov }}</ion-select-option>
              </ion-select>

              <ion-textarea v-model="bio" rows="3" placeholder="Short bio..." class="custom-ion-textarea"></ion-textarea>

              <ion-button type="button" @click="handleRegister" class="ionic-primary-btn" :disabled="isLoading" style="--background: #C89F8A;">
                <div v-if="isLoading" class="loading-content">
                  <ion-spinner name="crescent" class="small-spinner"></ion-spinner>
                  <span>{{ loadingMessage }}</span>
                </div>
                <span v-else>Create account</span>
              </ion-button>
            </div>

          </form>

          <p class="signin-text">
            Already have an account?
            <router-link to="/login">Sign in</router-link>
          </p>

        </div>
      </div>
    </ion-content>
  </ion-page>
</template>

<style scoped>
.auth-wrapper {
  min-height: 100%;
  background: #F8F4F0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
}

.signup-card {
  width: 100%;
  max-width: 380px;
  background: #FFFFFF;
  padding: 40px;
  border-radius: 16px;
  box-shadow: 0 10px 25px rgba(0,0,0,0.08);
  text-align: center;
}

.title {
  font-size: 26px;
  font-weight: 600;
  margin-top: 0;
  margin-bottom: 25px;
  color: #3b2b26;
}

.sub-title {
  font-size: 16px;
  font-weight: 600;
  color: #3b2b26;
  margin-bottom: 10px;
  margin-top: 0;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.custom-ion-input, .custom-ion-select, .custom-ion-textarea {
  --padding-start: 6px;
  --padding-end: 6px;
  --padding-top: 12px;
  --padding-bottom: 12px;
  --placeholder-color: #D9D9D9;
  border-bottom: 1px solid #c9c3bf;
  font-size: 14px;
  text-align: left;
}

.custom-ion-input:focus-within, .custom-ion-select:focus-within, .custom-ion-textarea:focus-within {
  border-bottom: 2px solid #C89F8A;
}

.ionic-primary-btn {
  margin-top: 20px;
  height: 50px;
  --border-radius: 10px;
  font-weight: 600;
  font-size: 15px;
  width: 100%;
}

.loading-content {
  display: flex;
  align-items: center;
  gap: 10px;
}

.small-spinner {
  width: 20px;
  height: 20px;
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
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  margin-bottom: 10px;
}

.portfolio-item {
  aspect-ratio: 1;
  background: #f4f4f4;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  overflow: hidden;
}

.portfolio-item img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.back-btn {
  background: none;
  border: none;
  text-align: left;
  cursor: pointer;
  color: #8B7355;
  font-weight: 600;
  padding: 0;
  font-size: 14px;
}

.signin-text {
  color: #2C1810;
  font-size: 14px;
  margin-top: 20px;
}

.signin-text a {
  color: #C89F8A;
  text-decoration: none;
  font-weight: 600;
}

.signin-text a:hover {
  text-decoration: underline;
}
</style>