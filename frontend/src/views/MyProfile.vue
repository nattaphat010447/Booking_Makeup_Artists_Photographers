<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import Navbar from '../components/layout/Navbar.vue';
import { auth, db } from '../config/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { onAuthStateChanged, updatePassword } from 'firebase/auth';
import { IonPage, IonContent, IonInput, IonSelect, IonSelectOption, IonTextarea, IonButton, IonSpinner } from '@ionic/vue';

const router = useRouter();

// ================= State =================
const isLoading = ref(true);
const isSaving = ref(false);
const saveMessage = ref('');

// User Info
const uid = ref('');
const role = ref('customer');
const email = ref('');
const newPassword = ref('');

// Basic Fields
const fullName = ref('');
const phone = ref('');
const profilePreview = ref<string>('https://via.placeholder.com/100');
const newProfileImage = ref<File | null>(null);

// Provider Fields
const specialty = ref('');
const bio = ref('');
const location = ref('');
const priceStart = ref(0);
const serviceType = ref(''); 
const ratingAvg = ref(0);
const soldCount = ref(0);

// Portfolios 
const portfolioPreviews = ref<(string | null)[]>([null, null, null, null, null, null]);
const newPortfolioImages = ref<(File | null)[]>([null, null, null, null, null, null]);

const provinces = ['กระบี่', 'กาญจนบุรี', 'กาฬสินธุ์', 'กำแพงเพชร', 'ขอนแก่น', 'จันทบุรี', 'ฉะเชิงเทรา', 'ชลบุรี', 'ชัยนาท', 'ชัยภูมิ', 'ชุมพร', 'เชียงราย', 'เชียงใหม่', 'ตรัง', 'ตราด', 'ตาก', 'นครนายก', 'นครปฐม', 'นครพนม', 'นครราชสีมา', 'นครศรีธรรมราช', 'นครสวรรค์', 'นนทบุรี', 'นราธิวาส', 'น่าน', 'บึงกาฬ', 'บุรีรัมย์', 'ปทุมธานี', 'ประจวบคีรีขันธ์', 'ปราจีนบุรี', 'ปัตตานี', 'พระนครศรีอยุธยา', 'พะเยา', 'พังงา', 'พัทลุง', 'พิจิตร', 'พิษณุโลก', 'เพชรบุรี', 'เพชรบูรณ์', 'แพร่', 'ภูเก็ต', 'มหาสารคาม', 'มุกดาหาร', 'แม่ฮ่องสอน', 'ยโสธร', 'ยะลา', 'ร้อยเอ็ด', 'ระนอง', 'ระยอง', 'ราชบุรี', 'ลพบุรี', 'ลำปาง', 'ลำพูน', 'เลย', 'ศรีสะเกษ', 'สกลนคร', 'สงขลา', 'สตูล', 'สมุทรปราการ', 'สมุทรสงคราม', 'สมุทรสาคร', 'สระแก้ว', 'สระบุรี', 'สิงห์บุรี', 'สุโขทัย', 'สุพรรณบุรี', 'สุราษฎร์ธานี', 'สุรินทร์', 'หนองคาย', 'หนองบัวลำภู', 'อ่างทอง', 'อำนาจเจริญ', 'อุดรธานี', 'อุตรดิตถ์', 'อุทัยธานี', 'อุบลราชธานี', 'กรุงเทพมหานคร'];

// ================= Functions =================

onMounted(() => {
  onAuthStateChanged(auth, async (user) => {
    if (user) {
      uid.value = user.uid;
      email.value = user.email || '';
      await fetchUserData(user.uid);
    } else {
      router.push('/login');
    }
  });
});

const fetchUserData = async (userId: string) => {
  try {
    const docRef = doc(db, 'users', userId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const data = docSnap.data();
      role.value = data.role;
      fullName.value = data.full_name;
      phone.value = data.phone;
      if (data.profile_image) profilePreview.value = data.profile_image;

      if (data.role === 'provider' && data.provider_info) {
        const info = data.provider_info;
        specialty.value = info.specialty || '';
        bio.value = info.bio || '';
        location.value = info.location || '';
        priceStart.value = info.price_start || 0;
        
        serviceType.value = info.service_type || 'makeup';
        ratingAvg.value = info.rating_avg || 0;
        soldCount.value = info.sold_count || 0;
        
        if (info.portfolios && Array.isArray(info.portfolios)) {
          info.portfolios.forEach((url: string, index: number) => {
            if (index < 6) portfolioPreviews.value[index] = url;
          });
        }
      }
    }
  } catch (error) {
    console.error("Error fetching user data:", error);
  } finally {
    isLoading.value = false;
  }
};

const handleProfileImage = (e: Event) => {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (file) {
    newProfileImage.value = file;
    profilePreview.value = URL.createObjectURL(file);
  }
};

const handlePortfolioImage = (e: Event, index: number) => {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (file) {
    newPortfolioImages.value[index] = file;
    portfolioPreviews.value[index] = URL.createObjectURL(file);
  }
};

const uploadToCloudinary = async (file: File | null): Promise<string> => {
  if (!file) return '';
  const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
  const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;
  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', uploadPreset);

  const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
    method: 'POST',
    body: formData,
  });
  const data = await res.json();
  return data.secure_url;
};

const handleSave = async () => {
  isSaving.value = true;
  saveMessage.value = 'กำลังบันทึกข้อมูล...';
  
  try {
    let currentProfileUrl = profilePreview.value;
    
    if (newProfileImage.value) {
      saveMessage.value = 'กำลังอัปโหลดรูปโปรไฟล์...';
      currentProfileUrl = await uploadToCloudinary(newProfileImage.value);
    }

    const updateData: any = {
      full_name: fullName.value,
      phone: phone.value,
      profile_image: currentProfileUrl,
      updated_at: new Date()
    };

    if (role.value === 'provider') {
      saveMessage.value = 'กำลังจัดการรูปผลงาน...';
      
      let updatedPortfolios = [...portfolioPreviews.value]; 
      
      for (let i = 0; i < 6; i++) {
        if (newPortfolioImages.value[i]) {
          const newUrl = await uploadToCloudinary(newPortfolioImages.value[i] as File | null);
          updatedPortfolios[i] = newUrl;
        }
      }

      const finalPortfolios = updatedPortfolios.filter(url => url !== null);

      updateData.provider_info = {
        service_type: serviceType.value,
        specialty: specialty.value,
        bio: bio.value,
        location: location.value,
        price_start: priceStart.value,
        portfolios: finalPortfolios,
        rating_avg: ratingAvg.value, 
        sold_count: soldCount.value
      };
    }

    saveMessage.value = 'กำลังบันทึกลงระบบ...';
    await updateDoc(doc(db, 'users', uid.value), updateData);

    if (newPassword.value && auth.currentUser) {
      saveMessage.value = 'กำลังเปลี่ยนรหัสผ่าน...';
      await updatePassword(auth.currentUser, newPassword.value);
      newPassword.value = ''; 
    }

    alert('บันทึกข้อมูลเรียบร้อยแล้ว!');
  } catch (error: any) {
    console.error(error);
    alert('เกิดข้อผิดพลาด: ' + (error.message || 'กรุณาลองใหม่'));
  } finally {
    isSaving.value = false;
    saveMessage.value = '';
  }
};
</script>

<template>
  <ion-page>
    <Navbar />

    <ion-content class="custom-content">
      <div class="page-container">
        
        <div v-if="isLoading" class="loading">
          <ion-spinner name="crescent" color="medium"></ion-spinner>
          <p>กำลังโหลดข้อมูลของคุณ...</p>
        </div>

        <div v-else class="profile-editor">
          <h2>จัดการโปรไฟล์</h2>

          <form @submit.prevent="handleSave">
            
            <div class="section-card">
              <h3>ข้อมูลส่วนตัว</h3>
              
              <div class="profile-upload">
                <div class="preview-box">
                  <img :src="profilePreview" alt="Profile" class="img-preview" />
                </div>
                <label class="btn-change-img">
                  เปลี่ยนรูปภาพ
                  <input type="file" accept="image/*" class="hidden" @change="handleProfileImage" :disabled="isSaving" />
                </label>
              </div>

              <div class="input-group">
                <label>อีเมล:</label>
                <ion-input type="email" :value="email" disabled class="custom-ion-input disabled-input"></ion-input>
              </div>

              <div class="input-group">
                <label>ชื่อ-นามสกุล:</label>
                <ion-input v-model="fullName" type="text" class="custom-ion-input" required :disabled="isSaving"></ion-input>
              </div>

              <div class="input-group">
                <label>เบอร์โทรศัพท์:</label>
                <ion-input v-model="phone" type="tel" class="custom-ion-input" required :disabled="isSaving"></ion-input>
              </div>

              <div class="input-group">
                <label>เปลี่ยนรหัสผ่านใหม่:</label>
                <ion-input v-model="newPassword" type="password" placeholder="รหัสผ่านใหม่ (ไม่บังคับ)" class="custom-ion-input" :minlength="6" :disabled="isSaving"></ion-input>
                <small class="hint">* การเปลี่ยนรหัสผ่านอาจจะต้องทำการ Login ใหม่อีกครั้ง</small>
              </div>
            </div>

            <div v-if="role === 'provider'" class="section-card">
              <h3>ข้อมูลผู้ให้บริการ (Portfolio & Bio)</h3>

              <div class="input-group">
                <label>ประเภทงานที่รับ:</label>
                <ion-input v-model="specialty" type="text" placeholder="เช่น Cosplay Makeup..." class="custom-ion-input" :disabled="isSaving"></ion-input>
              </div>

              <div class="input-group">
                <label>ราคาเริ่มต้น (บาท):</label>
                <ion-input v-model="priceStart" type="number" min="0" class="custom-ion-input" required :disabled="isSaving"></ion-input>
              </div>

              <div class="input-group">
                <label>จังหวัดที่รับงาน:</label>
                <ion-select v-model="location" class="custom-ion-select" interface="popover" required :disabled="isSaving">
                  <ion-select-option v-for="prov in provinces" :key="prov" :value="prov">{{ prov }}</ion-select-option>
                </ion-select>
              </div>

              <div class="input-group">
                <label>Bio (แนะนำตัว):</label>
                <ion-textarea v-model="bio" :rows="4" class="custom-ion-textarea" :disabled="isSaving"></ion-textarea>
              </div>

              <div class="input-group">
                <label>แก้ไขรูปผลงาน (Portfolio):</label>
                <div class="portfolio-grid">
                  <div v-for="index in 6" :key="index" class="portfolio-item">
                    <label :for="'edit-portfolio-' + index" class="upload-area">
                      <img v-if="portfolioPreviews[index-1]" :src="portfolioPreviews[index-1]!" class="img-preview" />
                      <span v-else>+</span>
                    </label>
                    <input :id="'edit-portfolio-' + index" type="file" accept="image/*" class="hidden" @change="(e) => handlePortfolioImage(e, index-1)" :disabled="isSaving" />
                  </div>
                </div>
                <small class="hint">คลิกที่รูปเพื่ออัปโหลดทับรูปเดิม</small>
              </div>
            </div>

            <ion-button type="submit" expand="block" class="ionic-primary-btn" :disabled="isSaving" style="--background: #C89F8A;">
              <div v-if="isSaving" style="display: flex; align-items: center; gap: 8px;">
                <ion-spinner name="crescent"></ion-spinner>
                <span>{{ saveMessage }}</span>
              </div>
              <span v-else>บันทึกการเปลี่ยนแปลง</span>
            </ion-button>
          </form>
        </div>

      </div>
    </ion-content>
  </ion-page>
</template>

<style scoped>
.page-container { min-height: 100%; background: #FAFAFA; padding-bottom: 40px; }
.custom-content { --background: #FAFAFA; }
.loading { text-align: center; padding: 60px 20px; color: #888; }

.profile-editor { padding: 30px 20px; max-width: 600px; margin: 0 auto; width: 100%; }
.profile-editor h2 { margin-top: 0; margin-bottom: 24px; color: #3b2b26; text-align: center; font-size: 26px; font-weight: 700;}

.section-card { background: #FFFFFF; padding: 28px 24px; border-radius: 20px; box-shadow: 0 4px 20px rgba(0,0,0,0.03); margin-bottom: 24px; border: 1px solid rgba(0,0,0,0.04); }
.section-card h3 { margin-top: 0; border-bottom: 1px solid rgba(0,0,0,0.05); padding-bottom: 16px; margin-bottom: 24px; font-size: 18px; color: #C89F8A; font-weight: 700;}

.profile-upload { display: flex; flex-direction: column; align-items: center; margin-bottom: 32px; }
.preview-box { width: 120px; height: 120px; border-radius: 50%; overflow: hidden; border: 4px solid #f4efe9; margin-bottom: 16px; }
.img-preview { width: 100%; height: 100%; object-fit: cover; }
.btn-change-img { background: #3b2b26; color: white; padding: 8px 20px; border-radius: 24px; font-size: 13px; cursor: pointer; font-weight: 600; transition: 0.2s; }
.hidden { display: none; }

.input-group { margin-bottom: 20px; text-align: left; }
.input-group label { display: block; font-weight: 600; margin-bottom: 8px; font-size: 14px; color: #444; }

.custom-ion-input, .custom-ion-select, .custom-ion-textarea {
  --padding-start: 16px;
  --padding-end: 16px;
  --padding-top: 14px;
  --padding-bottom: 14px;
  --background: #faf8f5;
  border: 1px solid #e0d8d0;
  border-radius: 12px;
  font-size: 15px;
  transition: 0.2s;
}

.custom-ion-input.ion-focused, .custom-ion-select.ion-focused, .custom-ion-textarea.ion-focused {
  border-color: #C89F8A;
}

.disabled-input { --background: #f0ebe6; opacity: 0.7; }
.hint { font-size: 12px; color: #C89F8A; margin-top: 8px; display: block; }

.portfolio-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-top: 10px; }
.upload-area { display: flex; align-items: center; justify-content: center; aspect-ratio: 1; border: 2px dashed #e0d8d0; border-radius: 14px; cursor: pointer; overflow: hidden; background: #faf8f5; transition: 0.2s; font-size: 24px; color: #ccc; }
.upload-area:hover { border-color: #C89F8A; color: #C89F8A; }

.ionic-primary-btn { margin-top: 20px; height: 56px; --border-radius: 14px; font-weight: 600; font-size: 16px; font-family: inherit; }
</style>