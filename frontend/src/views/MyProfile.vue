<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import Navbar from '../components/layout/Navbar.vue';
import { auth, db } from '../config/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { onAuthStateChanged, updatePassword } from 'firebase/auth';

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

const provinces = ['กรุงเทพมหานคร', 'เชียงใหม่', 'ขอนแก่น', 'ชลบุรี', 'ภูเก็ต', 'นครราชสีมา'];

// ================= Functions =================

onMounted(() => {
  onAuthStateChanged(auth, async (user) => {
    if (user) {
      uid.value = user.uid;
      email.value = user.email || '';
      await fetchUserData(user.uid);
    } else {
      alert('กรุณาเข้าสู่ระบบก่อน');
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

      // ถ้าเป็นช่าง ให้ดึงข้อมูล provider มาแสดงด้วย
      if (data.role === 'provider' && data.provider_info) {
        const info = data.provider_info;
        specialty.value = info.specialty || '';
        bio.value = info.bio || '';
        location.value = info.location || '';
        priceStart.value = info.price_start || 0;
        
        // 💡 เก็บค่าเดิมไว้
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
          const newUrl = await uploadToCloudinary(newPortfolioImages.value[i]);
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
  <div class="page-container">
    <Navbar />

    <div v-if="isLoading" class="loading">กำลังโหลดข้อมูลของคุณ...</div>

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
            <input type="email" :value="email" disabled class="disabled-input" />
          </div>

          <div class="input-group">
            <label>ชื่อ-นามสกุล:</label>
            <input v-model="fullName" type="text" required :disabled="isSaving" />
          </div>

          <div class="input-group">
            <label>เบอร์โทรศัพท์:</label>
            <input v-model="phone" type="text" required :disabled="isSaving" />
          </div>

          <div class="input-group">
            <label>เปลี่ยนรหัสผ่านใหม่ (เว้นว่างไว้หากไม่ต้องการเปลี่ยน):</label>
            <input v-model="newPassword" type="password" placeholder="รหัสผ่านใหม่" minlength="6" :disabled="isSaving" />
            <small class="hint">* การเปลี่ยนรหัสผ่านอาจจะต้องทำการ Login ใหม่อีกครั้ง</small>
          </div>
        </div>

        <div v-if="role === 'provider'" class="section-card">
          <h3>ข้อมูลผู้ให้บริการ (Portfolio & Bio)</h3>

          <div class="input-group">
            <label>ประเภทงานที่รับ:</label>
            <input v-model="specialty" type="text" placeholder="เช่น Cosplay Makeup..." :disabled="isSaving" />
          </div>

          <div class="input-group">
            <label>ราคาเริ่มต้น (บาท):</label>
            <input v-model="priceStart" type="number" min="0" required :disabled="isSaving" />
          </div>

          <div class="input-group">
            <label>จังหวัดที่รับงาน:</label>
            <select v-model="location" required :disabled="isSaving">
              <option value="" disabled>-- เลือกจังหวัด --</option>
              <option v-for="prov in provinces" :key="prov" :value="prov">{{ prov }}</option>
            </select>
          </div>

          <div class="input-group">
            <label>Bio (แนะนำตัว):</label>
            <textarea v-model="bio" rows="4" :disabled="isSaving"></textarea>
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

        <button type="submit" class="btn-save" :disabled="isSaving">
          {{ isSaving ? saveMessage : 'บันทึกการเปลี่ยนแปลง' }}
        </button>
      </form>
    </div>
  </div>
</template>

