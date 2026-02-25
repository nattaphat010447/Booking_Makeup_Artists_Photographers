<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import Navbar from '../components/layout/Navbar.vue';
import { db, auth } from '../config/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';

const route = useRoute();
const router = useRouter();
const providerId = route.params.id as string; // รับ ID ช่างมาจาก URL (เช่น /provider/123)

// ================= State =================
const provider = ref<any>(null);
const isLoading = ref(true);
const mainImage = ref('');
const isLoggedIn = ref(false);
const showAuthModal = ref(false); // ควบคุมการแสดง Popup ล็อคอิน

// Mockup รีวิว (ตามที่คุณออกแบบไว้ ให้โชว์สูงสุด 10 อัน)
const reviews = ref([
  { id: 1, user_name: 'คุณเหมียว', profile: 'https://via.placeholder.com/40', rating: 5, comment: 'แต่งหน้าสวยมากค่ะ ติดทนทั้งวันเลย รูปถ่ายออกมาเป๊ะมาก' },
  { id: 2, user_name: 'คุณสมชาย', profile: 'https://via.placeholder.com/40', rating: 4.8, comment: 'ตรงเวลา ทำงานโปรมากครับ แนะนำเลย' }
]);

// ================= Functions =================
onMounted(() => {
  // 1. เช็คสถานะ Login ก่อนว่า Login หรือยัง
  onAuthStateChanged(auth, (user) => {
    isLoggedIn.value = !!user;
  });
  
  // 2. ดึงข้อมูลช่าง
  fetchProvider();
});

const fetchProvider = async () => {
  isLoading.value = true;
  try {
    const docRef = doc(db, 'users', providerId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      provider.value = docSnap.data();
      // ตั้งรูปใหญ่เป็นรูปแรกของ Portfolio
      if (provider.value.provider_info?.portfolios?.length > 0) {
        mainImage.value = provider.value.provider_info.portfolios[0];
      }
    } else {
      alert('ไม่พบข้อมูลผู้ให้บริการท่านนี้');
      router.push('/search');
    }
  } catch (error) {
    console.error('Error fetching provider:', error);
  } finally {
    isLoading.value = false;
  }
};

const handleChatClick = () => {
  if (isLoggedIn.value) {
    // ถ้าล็อคอินแล้ว ให้ไปหน้าแชท
    router.push(`/chat/${providerId}`);
  } else {
    // ถ้ายันไม่ล็อคอิน ให้แสดง Popup
    showAuthModal.value = true;
  }
};
</script>

<template>
  <div class="page-container">
    <Navbar />

    <div v-if="isLoading" class="loading">กำลังโหลดข้อมูลช่าง...</div>
    
    <div v-else-if="provider" class="content">
      <div class="gallery-section">
        <img :src="mainImage || 'https://via.placeholder.com/390x350'" class="main-image" />
        <div class="thumbnail-list">
          <img 
            v-for="(img, idx) in provider.provider_info?.portfolios" 
            :key="idx" 
            :src="img" 
            class="thumbnail" 
            :class="{ active: mainImage === img }"
            @click="mainImage = img"
          />
        </div>
      </div>

      <div class="details-section">
        <h2 class="specialty">{{ provider.provider_info?.specialty || 'รับงานทั่วไป' }}</h2>
        <div class="stats">
          <span>💼 Sold 121 ครั้ง</span>
          <span>⭐ {{ provider.provider_info?.rating_avg || '0.0' }}</span>
        </div>
        <div class="price">
          เริ่มต้นที่ {{ provider.provider_info?.price_start || 0 }} บาท
        </div>
        
        <div class="bio-box">
          <p>{{ provider.provider_info?.bio || 'ช่างยังไม่ได้เพิ่มคำแนะนำตัว...' }}</p>
        </div>

        <div class="profile-row">
          <img :src="provider.profile_image || 'https://via.placeholder.com/50'" class="avatar" />
          <div class="name-info">
            <span class="name">{{ provider.full_name }}</span>
            <span class="role">{{ provider.provider_info?.service_type === 'makeup' ? 'ช่างแต่งหน้า' : 'ช่างภาพ' }}</span>
          </div>
        </div>

        <button class="chat-btn" @click="handleChatClick">💬 คุยกับ Service Provider</button>
      </div>

      <div class="reviews-section">
        <h3>รีวิวจากลูกค้า ({{ reviews.length }})</h3>
        <div v-for="rev in reviews" :key="rev.id" class="review-card">
          <div class="rev-header">
            <img :src="rev.profile" class="rev-avatar" />
            <div class="rev-name">
              <span>{{ rev.user_name }}</span>
              <span class="stars">⭐ {{ rev.rating }}</span>
            </div>
          </div>
          <p class="rev-comment">"{{ rev.comment }}"</p>
        </div>
        <button class="view-more-btn">ดูรีวิวทั้งหมด</button>
      </div>
    </div>

    <div v-if="showAuthModal" class="modal-overlay" @click.self="showAuthModal = false">
      <div class="modal-box">
        <h3>กรุณาสร้างบัญชีหรือเข้าสู่ระบบ<br>เพื่อพูดคุยกับ Service Provider</h3>
        <div class="modal-actions">
          <button class="btn-solid" @click="router.push('/login')">Sign In</button>
          <button class="btn-outline" @click="router.push('/register')">Sign Up</button>
        </div>
        <button class="close-btn" @click="showAuthModal = false">ปิด</button>
      </div>
    </div>

  </div>
</template>

<style scoped>
.page-container { display: flex; flex-direction: column; min-height: 100vh; background: #fff; padding-bottom: 40px;}
.loading { text-align: center; padding: 50px; color: #888; }

/* Gallery */
.gallery-section { display: flex; flex-direction: column; }
.main-image { width: 100%; height: 350px; object-fit: cover; }
.thumbnail-list { display: flex; overflow-x: auto; gap: 10px; padding: 10px 15px; background: #f9f9f9; }
.thumbnail { width: 65px; height: 65px; object-fit: cover; border-radius: 8px; cursor: pointer; opacity: 0.6; transition: 0.3s; }
.thumbnail.active, .thumbnail:hover { opacity: 1; border: 2px solid #333; }

/* Details */
.details-section { padding: 20px; text-align: left; border-bottom: 8px solid #f0f2f5; }
.specialty { margin: 0 0 10px 0; font-size: 22px; color: #333; }
.stats { display: flex; gap: 15px; color: #666; font-size: 14px; margin-bottom: 10px; }
.price { font-size: 18px; font-weight: bold; color: #e53935; margin-bottom: 15px; }
.bio-box { background: #f9f9f9; padding: 15px; border-radius: 8px; font-size: 14px; color: #555; margin-bottom: 20px; line-height: 1.5; }

.profile-row { display: flex; align-items: center; gap: 15px; margin-bottom: 20px; }
.avatar { width: 50px; height: 50px; border-radius: 50%; object-fit: cover; }
.name-info { display: flex; flex-direction: column; }
.name { font-weight: bold; font-size: 16px; }
.role { font-size: 12px; color: #888; }

.chat-btn { width: 100%; padding: 15px; background: #333; color: white; border: none; border-radius: 8px; font-size: 16px; font-weight: bold; cursor: pointer; }

/* Reviews */
.reviews-section { padding: 20px; text-align: left; }
.reviews-section h3 { margin-top: 0; margin-bottom: 15px; font-size: 18px; }
.review-card { padding: 15px; border: 1px solid #eee; border-radius: 8px; margin-bottom: 15px; }
.rev-header { display: flex; align-items: center; gap: 10px; margin-bottom: 10px; }
.rev-avatar { width: 35px; height: 35px; border-radius: 50%; object-fit: cover;}
.rev-name { display: flex; flex-direction: column; font-size: 14px; font-weight: bold; }
.stars { font-size: 12px; color: #f5b041; }
.rev-comment { font-size: 14px; color: #555; margin: 0; }
.view-more-btn { width: 100%; padding: 10px; background: none; border: 1px solid #ccc; border-radius: 8px; cursor: pointer; font-weight: bold; }

/* Modal */
.modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.6); display: flex; align-items: center; justify-content: center; z-index: 1000; }
.modal-box { background: white; padding: 25px; border-radius: 12px; width: 85%; max-width: 320px; text-align: center; }
.modal-box h3 { font-size: 16px; margin-top: 0; margin-bottom: 20px; line-height: 1.5; }
.modal-actions { display: flex; gap: 10px; margin-bottom: 15px; }
.btn-solid { flex: 1; padding: 12px; background: #333; color: white; border: none; border-radius: 8px; font-weight: bold; cursor: pointer; }
.btn-outline { flex: 1; padding: 12px; background: transparent; border: 1px solid #333; color: #333; border-radius: 8px; font-weight: bold; cursor: pointer; }
.close-btn { background: none; border: none; color: #888; cursor: pointer; text-decoration: underline; }
</style>