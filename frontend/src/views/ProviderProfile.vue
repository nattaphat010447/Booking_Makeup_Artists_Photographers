<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import Navbar from '../components/layout/Navbar.vue';
import { db, auth } from '../config/firebase';
import { doc, getDoc, collection, query, where, getDocs, addDoc, serverTimestamp, updateDoc, deleteDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';

const route = useRoute();
const router = useRouter();
const providerId = route.params.id as string;

// ================= State =================
const provider = ref<any>(null);
const isLoading = ref(true);
const mainImage = ref('');
const isLoggedIn = ref(false);
const showAuthModal = ref(false);

const currentUser = ref<any>(null);
const currentUserRole = ref<string>(''); // 💡 เก็บ Role ของคนที่กำลังดูหน้านี้
const canReview = ref(false); 
const hasReviewed = ref(false);
const myReview = ref<any>(null);
const isSubmittingReview = ref(false);
const isEditingReview = ref(false); 

const reviews = ref<any[]>([]);
const reviewForm = ref({
  rating: 5,
  comment: ''
});

// ================= Functions =================
onMounted(() => {
  fetchProvider();
  
  onAuthStateChanged(auth, async (user) => {
    isLoggedIn.value = !!user;
    if (user) {
      currentUser.value = user;
      
      // 💡 ดึง Role ของตัวเองเพื่อเอาไปเช็คซ่อนปุ่ม
      const myDoc = await getDoc(doc(db, 'users', user.uid));
      if (myDoc.exists()) {
        currentUserRole.value = myDoc.data().role;
      }

      await fetchReviews(); 
      await checkCanReview(user.uid);
    } else {
      currentUserRole.value = '';
      await fetchReviews();
    }
  });
});

const formatEditedTime = (timestamp: any) => {
  if (!timestamp) return '';
  const d = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${pad(d.getHours())}:${pad(d.getMinutes())} ${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
};

const updateProviderRating = async () => {
  const q = query(collection(db, 'reviews'), where('providerId', '==', providerId));
  const snap = await getDocs(q);
  let total = 0;
  let count = 0;
  snap.forEach(document => {
    total += document.data().rating;
    count++;
  });
  
  const newAvg = count > 0 ? (total / count).toFixed(1) : 0;
  await updateDoc(doc(db, 'users', providerId), {
    'provider_info.rating_avg': parseFloat(newAvg as string)
  });
};

const fetchProvider = async () => {
  isLoading.value = true;
  try {
    const docRef = doc(db, 'users', providerId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      provider.value = docSnap.data();
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

const fetchReviews = async () => {
  try {
    const q = query(collection(db, 'reviews'), where('providerId', '==', providerId));
    const snap = await getDocs(q);
    const fetchedReviews: any[] = [];
    
    snap.forEach(document => {
      fetchedReviews.push({ id: document.id, ...document.data() });
    });
    
    reviews.value = fetchedReviews.sort((a, b) => b.createdAt?.toMillis() - a.createdAt?.toMillis());

    if (currentUser.value) {
      const foundMyReview = reviews.value.find(r => r.customerId === currentUser.value.uid);
      if (foundMyReview) {
        myReview.value = foundMyReview;
        hasReviewed.value = true;
      } else {
        myReview.value = null;
        hasReviewed.value = false;
      }
    }
  } catch (error) {
    console.error('Error fetching reviews:', error);
  }
};

const checkCanReview = async (myUid: string) => {
  try {
    if (myUid === providerId || hasReviewed.value) {
      canReview.value = false;
      return;
    }
    const roomId = myUid < providerId ? `${myUid}_${providerId}` : `${providerId}_${myUid}`;
    const q = query(collection(db, 'chats', roomId, 'messages'), where('type', '==', 'quotation'));
    const snap = await getDocs(q);
    const hasPaid = snap.docs.some(document => document.data().data?.status === 'paid');
    canReview.value = hasPaid;
  } catch (error) {
    console.error('Error checking review eligibility:', error);
  }
};

const handleChatClick = () => {
  if (isLoggedIn.value) {
    router.push(`/chat/${providerId}`);
  } else {
    showAuthModal.value = true;
  }
};

const submitReview = async () => {
  if (!reviewForm.value.comment.trim()) {
    alert('กรุณากรอกข้อความรีวิว');
    return;
  }
  isSubmittingReview.value = true;
  try {
    const myDoc = await getDoc(doc(db, 'users', currentUser.value.uid));
    const myData = myDoc.exists() ? myDoc.data() : { full_name: 'ผู้ใช้งาน', profile_image: '' };

    const newReview = {
      providerId: providerId,
      customerId: currentUser.value.uid,
      customerName: myData.full_name,
      customerProfile: myData.profile_image || 'https://via.placeholder.com/40',
      rating: reviewForm.value.rating,
      comment: reviewForm.value.comment,
      createdAt: serverTimestamp()
    };

    await addDoc(collection(db, 'reviews'), newReview);
	
	await addDoc(collection(db, 'notifications'), {
      userId: providerId,
      type: 'review',
      title: '⭐ คุณได้รับรีวิวใหม่!',
      message: `ลูกค้า ${myData.full_name} ได้เขียนรีวิวและให้คะแนนคุณ ${reviewForm.value.rating} ดาว`,
      isRead: false,
      createdAt: serverTimestamp(),
      link: `/provider/${providerId}`
    });
	
    await updateProviderRating();

    alert('ขอบคุณสำหรับรีวิวครับ!');
    reviewForm.value.comment = ''; 
    canReview.value = false; 
    
    await fetchReviews();
    await fetchProvider();
  } catch (error) {
    console.error('Error submitting review:', error);
    alert('เกิดข้อผิดพลาดในการส่งรีวิว');
  } finally {
    isSubmittingReview.value = false;
  }
};

const startEditReview = () => {
  reviewForm.value.rating = myReview.value.rating;
  reviewForm.value.comment = myReview.value.comment;
  isEditingReview.value = true;
};

const saveEditedReview = async () => {
  if (!reviewForm.value.comment.trim()) {
    alert('กรุณากรอกข้อความรีวิว');
    return;
  }
  isSubmittingReview.value = true;
  try {
    const reviewRef = doc(db, 'reviews', myReview.value.id);
    await updateDoc(reviewRef, {
      rating: reviewForm.value.rating,
      comment: reviewForm.value.comment,
      updatedAt: serverTimestamp() 
    });

    await updateProviderRating();
    
    alert('อัปเดตรีวิวเรียบร้อยครับ!');
    isEditingReview.value = false;
    reviewForm.value.comment = '';
    
    await fetchReviews();
    await fetchProvider();
  } catch (error) {
    console.error('Error updating review:', error);
    alert('เกิดข้อผิดพลาดในการแก้ไขรีวิว');
  } finally {
    isSubmittingReview.value = false;
  }
};

const deleteReview = async () => {
  if (!confirm('คุณแน่ใจหรือไม่ที่จะลบรีวิวนี้?')) return;
  try {
    const reviewRef = doc(db, 'reviews', myReview.value.id);
    await deleteDoc(reviewRef);
    
    await updateProviderRating();

    alert('ลบรีวิวเรียบร้อยแล้ว');
    hasReviewed.value = false;
    myReview.value = null;
    isEditingReview.value = false;
    
    await checkCanReview(currentUser.value.uid);
    await fetchReviews();
    await fetchProvider();
  } catch (error) {
    console.error('Error deleting review:', error);
    alert('เกิดข้อผิดพลาดในการลบรีวิว');
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
          <span>💼 Sold {{ provider.provider_info?.sold_count || 0 }} ครั้ง</span>
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

        <button 
          v-if="currentUserRole !== 'provider'" 
          class="chat-btn" 
          @click="handleChatClick">
          💬 คุยกับ Service Provider
        </button>
      </div>

      <div class="reviews-section">
        <h3>รีวิวจากลูกค้า ({{ reviews.length }})</h3>

        <div v-if="hasReviewed && myReview" class="my-review-box">
          <div class="box-header">
            <h4>⭐ รีวิวของคุณ</h4>
            <div class="action-links" v-if="!isEditingReview">
              <span @click="startEditReview" class="link-edit">แก้ไข</span>
              <span @click="deleteReview" class="link-delete">ลบ</span>
            </div>
          </div>

          <div v-if="isEditingReview" class="review-form-box">
            <div class="rating-select">
              <label>ให้คะแนน: </label>
              <select v-model="reviewForm.rating">
                <option :value="5">⭐⭐⭐⭐⭐ (5/5)</option>
                <option :value="4">⭐⭐⭐⭐ (4/5)</option>
                <option :value="3">⭐⭐⭐ (3/5)</option>
                <option :value="2">⭐⭐ (2/5)</option>
                <option :value="1">⭐ (1/5)</option>
              </select>
            </div>
            <textarea v-model="reviewForm.comment" rows="3" placeholder="ความประทับใจต่องานนี้..."></textarea>
            <div class="form-actions">
              <button class="btn-cancel" @click="isEditingReview = false">ยกเลิก</button>
              <button class="btn-submit-review" @click="saveEditedReview" :disabled="isSubmittingReview">
                {{ isSubmittingReview ? 'กำลังบันทึก...' : 'บันทึกการแก้ไข' }}
              </button>
            </div>
          </div>

          <div v-else class="review-card highlight-mine">
            <div class="rev-header">
              <img :src="myReview.customerProfile" class="rev-avatar" />
              <div class="rev-name">
                <span>{{ myReview.customerName }}</span>
                <span class="stars">{{ '⭐'.repeat(myReview.rating) }}</span>
              </div>
            </div>
            <p class="rev-comment">"{{ myReview.comment }}"</p>
            <small v-if="myReview.updatedAt" class="edited-timestamp">
              แก้ไขแล้ว {{ formatEditedTime(myReview.updatedAt) }}
            </small>
          </div>
        </div>

        <div v-else-if="canReview" class="review-form-box">
          <h4>เขียนรีวิวของคุณ</h4>
          <div class="rating-select">
            <label>ให้คะแนน: </label>
            <select v-model="reviewForm.rating">
              <option :value="5">⭐⭐⭐⭐⭐ (5/5)</option>
              <option :value="4">⭐⭐⭐⭐ (4/5)</option>
              <option :value="3">⭐⭐⭐ (3/5)</option>
              <option :value="2">⭐⭐ (2/5)</option>
              <option :value="1">⭐ (1/5)</option>
            </select>
          </div>
          <textarea v-model="reviewForm.comment" rows="3" placeholder="ความประทับใจต่องานนี้..."></textarea>
          <button class="btn-submit-review" @click="submitReview" :disabled="isSubmittingReview">
            {{ isSubmittingReview ? 'กำลังส่งรีวิว...' : 'ส่งรีวิว' }}
          </button>
        </div>

        <div v-if="reviews.length === 0" class="no-reviews">ยังไม่มีรีวิวสำหรับช่างท่านนี้</div>

        <div v-for="rev in reviews" :key="rev.id" class="review-card">
          <div class="rev-header">
            <img :src="rev.customerProfile" class="rev-avatar" />
            <div class="rev-name">
              <span>{{ rev.customerName }}</span>
              <span class="stars">{{ '⭐'.repeat(rev.rating) }}</span>
            </div>
          </div>
          <p class="rev-comment">"{{ rev.comment }}"</p>
          <small v-if="rev.updatedAt" class="edited-timestamp">
            แก้ไขแล้ว {{ formatEditedTime(rev.updatedAt) }}
          </small>
        </div>

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
.gallery-section { display: flex; flex-direction: column; }
.main-image { width: 100%; height: 350px; object-fit: cover; }
.thumbnail-list { display: flex; overflow-x: auto; gap: 10px; padding: 10px 15px; background: #f9f9f9; }
.thumbnail { width: 65px; height: 65px; object-fit: cover; border-radius: 8px; cursor: pointer; opacity: 0.6; transition: 0.3s; }
.thumbnail.active, .thumbnail:hover { opacity: 1; border: 2px solid #333; }
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
.no-reviews { text-align: center; color: #888; padding: 20px 0; font-size: 14px; background: #fafafa; border-radius: 8px;}

/* CSS กล่องรีวิวของตัวเอง*/
.my-review-box { background: #E3F2FD; padding: 15px; border-radius: 8px; border: 1px solid #BBDEFB; margin-bottom: 20px; }
.box-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
.box-header h4 { margin: 0; color: #1976D2; font-size: 15px;}
.action-links { display: flex; gap: 15px; font-size: 13px; font-weight: bold; }
.link-edit { color: #1976D2; cursor: pointer; }
.link-delete { color: #D32F2F; cursor: pointer; }

/* CSS กล่องเขียนรีวิว / แก้ไข */
.review-form-box { background: white; padding: 15px; border-radius: 8px; margin-top: 10px;}
.review-form-box h4 { margin-top: 0; margin-bottom: 10px; color: #2e7d32; font-size: 15px;}
.rating-select { margin-bottom: 10px; font-size: 14px; }
.rating-select select { padding: 5px; border-radius: 4px; border: 1px solid #ccc; }
.review-form-box textarea { width: 100%; padding: 10px; border-radius: 8px; border: 1px solid #ccc; box-sizing: border-box; margin-bottom: 10px; font-family: inherit;}
.form-actions { display: flex; gap: 10px; }
.btn-cancel { flex: 1; background: #f0f2f5; color: #333; border: none; padding: 10px; border-radius: 8px; font-weight: bold; cursor: pointer; }
.btn-submit-review { flex: 2; background: #4CAF50; color: white; border: none; padding: 10px; border-radius: 8px; font-weight: bold; cursor: pointer; }
.btn-submit-review:disabled { background: #9E9E9E; cursor: not-allowed; }

/* การ์ดรีวิวทั่วไป */
.review-card { padding: 15px; border: 1px solid #eee; border-radius: 8px; margin-bottom: 15px; background: #fff;}
.highlight-mine { border: none !important; background: transparent !important; padding: 0 !important; margin-bottom: 0 !important; }
.rev-header { display: flex; align-items: center; gap: 10px; margin-bottom: 10px; }
.rev-avatar { width: 35px; height: 35px; border-radius: 50%; object-fit: cover;}
.rev-name { display: flex; flex-direction: column; font-size: 14px; font-weight: bold; }
.stars { font-size: 12px; color: #f5b041; }
.rev-comment { font-size: 14px; color: #555; margin: 0; line-height: 1.4;}
.edited-timestamp { display: block; margin-top: 8px; font-size: 11px; color: #9e9e9e; font-style: italic; }

/* Modal */
.modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.6); display: flex; align-items: center; justify-content: center; z-index: 1000; }
.modal-box { background: white; padding: 25px; border-radius: 12px; width: 85%; max-width: 320px; text-align: center; }
.modal-box h3 { font-size: 16px; margin-top: 0; margin-bottom: 20px; line-height: 1.5; }
.modal-actions { display: flex; gap: 10px; margin-bottom: 15px; }
.btn-solid { flex: 1; padding: 12px; background: #333; color: white; border: none; border-radius: 8px; font-weight: bold; cursor: pointer; }
.btn-outline { flex: 1; padding: 12px; background: transparent; border: 1px solid #333; color: #333; border-radius: 8px; font-weight: bold; cursor: pointer; }
.close-btn { background: none; border: none; color: #888; cursor: pointer; text-decoration: underline; }
</style>