<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import Navbar from '../components/layout/Navbar.vue';
import { db, auth } from '../config/firebase';
import { doc, getDoc, collection, query, where, getDocs, addDoc, serverTimestamp, updateDoc, deleteDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { IonPage, IonContent, IonButton, IonSpinner, IonTextarea } from '@ionic/vue';

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
const currentUserRole = ref<string>(''); 
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

const currentPage = ref(1);
const itemsPerPage = 5;

// ================= Functions =================
onMounted(() => {
  fetchProvider();
  onAuthStateChanged(auth, async (user) => {
    isLoggedIn.value = !!user;
    if (user) {
      currentUser.value = user;
      const myDoc = await getDoc(doc(db, 'users', user.uid));
      if (myDoc.exists()) currentUserRole.value = myDoc.data().role;
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
  let total = 0; let count = 0;
  snap.forEach(document => { total += document.data().rating; count++; });
  const newAvg = count > 0 ? (total / count).toFixed(1) : 0;
  await updateDoc(doc(db, 'users', providerId), { 'provider_info.rating_avg': parseFloat(newAvg as string) });
};

const fetchProvider = async () => {
  isLoading.value = true;
  try {
    const docRef = doc(db, 'users', providerId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      provider.value = docSnap.data();
      if (provider.value.provider_info?.portfolios?.length > 0) mainImage.value = provider.value.provider_info.portfolios[0];
    } else {
      alert('ไม่พบข้อมูลผู้ให้บริการท่านนี้');
      router.push('/search');
    }
  } catch (error) { console.error(error); } finally { isLoading.value = false; }
};


const fetchReviews = async () => {
  try {
    const q = query(collection(db, 'reviews'), where('providerId', '==', providerId));
    const snap = await getDocs(q);
    const fetchedReviews: any[] = [];
    snap.forEach(document => fetchedReviews.push({ id: document.id, ...document.data() }));
    reviews.value = fetchedReviews.sort((a, b) => b.createdAt?.toMillis() - a.createdAt?.toMillis());

    if (currentUser.value) {
      const foundMyReview = reviews.value.find(r => r.customerId === currentUser.value.uid);
      if (foundMyReview) { myReview.value = foundMyReview; hasReviewed.value = true; } 
      else { myReview.value = null; hasReviewed.value = false; }
    }
  } catch (error) { console.error(error); }
};

const checkCanReview = async (myUid: string) => {
  try {
    if (myUid === providerId || hasReviewed.value) { canReview.value = false; return; }
    const roomId = myUid < providerId ? `${myUid}_${providerId}` : `${providerId}_${myUid}`;
    const q = query(collection(db, 'chats', roomId, 'messages'), where('type', '==', 'quotation'));
    const snap = await getDocs(q);
    canReview.value = snap.docs.some(document => document.data().data?.status === 'paid');
  } catch (error) { console.error(error); }
};

const handleChatClick = () => {
  if (isLoggedIn.value) router.push(`/chat/${providerId}`);
  else showAuthModal.value = true;
};

const submitReview = async () => {
  if (!reviewForm.value.comment.trim()) { alert('กรุณากรอกข้อความรีวิว'); return; }
  isSubmittingReview.value = true;
  try {
    const myDoc = await getDoc(doc(db, 'users', currentUser.value.uid));
    const myData = myDoc.exists() ? myDoc.data() : { full_name: 'ผู้ใช้งาน', profile_image: '' };

    const newReview = {
      providerId: providerId, customerId: currentUser.value.uid,
      customerName: myData.full_name, customerProfile: myData.profile_image || 'https://via.placeholder.com/40',
      rating: reviewForm.value.rating, comment: reviewForm.value.comment, createdAt: serverTimestamp()
    };
    await addDoc(collection(db, 'reviews'), newReview);
    
    await addDoc(collection(db, 'notifications'), {
      userId: providerId, type: 'review', title: '⭐ คุณได้รับรีวิวใหม่!',
      message: `ลูกค้า ${myData.full_name} ได้เขียนรีวิวและให้คะแนนคุณ ${reviewForm.value.rating} ดาว`,
      isRead: false, createdAt: serverTimestamp(), link: `/provider/${providerId}`
    });
    
    await updateProviderRating();
    reviewForm.value.comment = ''; canReview.value = false; 
    await fetchReviews(); await fetchProvider();
  } catch (error) { alert('เกิดข้อผิดพลาดในการส่งรีวิว'); } 
  finally { isSubmittingReview.value = false; }
};

const startEditReview = () => {
  reviewForm.value.rating = myReview.value.rating;
  reviewForm.value.comment = myReview.value.comment;
  isEditingReview.value = true;
};

const saveEditedReview = async () => {
  if (!reviewForm.value.comment.trim()) { alert('กรุณากรอกข้อความรีวิว'); return; }
  isSubmittingReview.value = true;
  try {
    await updateDoc(doc(db, 'reviews', myReview.value.id), {
      rating: reviewForm.value.rating, comment: reviewForm.value.comment, updatedAt: serverTimestamp() 
    });
    await updateProviderRating();
    alert('อัปเดตรีวิวเรียบร้อยครับ!');
    isEditingReview.value = false; reviewForm.value.comment = '';
    await fetchReviews(); await fetchProvider();
  } catch (error) { alert('เกิดข้อผิดพลาดในการแก้ไขรีวิว'); } 
  finally { isSubmittingReview.value = false; }
};

const deleteReview = async () => {
  if (!confirm('คุณแน่ใจหรือไม่ที่จะลบรีวิวนี้?')) return;
  try {
    await deleteDoc(doc(db, 'reviews', myReview.value.id));
    await updateProviderRating();
    alert('ลบรีวิวเรียบร้อยแล้ว');
    hasReviewed.value = false; myReview.value = null; isEditingReview.value = false;
    await checkCanReview(currentUser.value.uid); await fetchReviews(); await fetchProvider();
  } catch (error) { alert('เกิดข้อผิดพลาดในการลบรีวิว'); }
};

const totalPages = computed(() => {
  return Math.ceil(reviews.value.length / itemsPerPage) || 1;
});

const paginatedReviews = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage;
  const end = start + itemsPerPage;
  return reviews.value.slice(start, end);
});

const reviewsSectionRef = ref<HTMLElement | null>(null); // สำหรับเลื่อนจอขึ้นไปบนสุดของคอมเมนต์

const nextPage = () => {
  if (currentPage.value < totalPages.value) {
    currentPage.value++;
    scrollToReviews();
  }
};

const prevPage = () => {
  if (currentPage.value > 1) {
    currentPage.value--;
    scrollToReviews();
  }
};

const scrollToReviews = () => {
  if (reviewsSectionRef.value) {
    reviewsSectionRef.value.scrollIntoView({ behavior: 'smooth' });
  }
};

const deleteReviewByAdmin = async (reviewId: string) => {
  if (!confirm('🚨 ยืนยันการลบรีวิวนี้ด้วยสิทธิ์แอดมิน?')) return;
  try {
    await deleteDoc(doc(db, 'reviews', reviewId));
    await updateProviderRating();
    alert('แอดมินลบรีวิวสำเร็จ');
    await fetchReviews(); 
    await fetchProvider();
  } catch (error) {
    console.error('Error deleting review:', error);
    alert('เกิดข้อผิดพลาดในการลบรีวิว');
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
          <p>กำลังโหลดข้อมูลช่าง...</p>
        </div>
        
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

            <ion-button 
              v-if="currentUserRole === 'customer'" 
              @click="handleChatClick" 
              expand="block" 
              style="--background: #3b2b26; --border-radius: 14px; height: 56px; font-weight: bold; font-size: 16px;">
              💬 คุยกับ Service Provider
            </ion-button>
          </div>

          <div class="reviews-section" ref="reviewsSectionRef">
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
                    <option :value="5">⭐⭐⭐⭐⭐</option>
                    <option :value="4">⭐⭐⭐⭐</option>
                    <option :value="3">⭐⭐⭐</option>
                    <option :value="2">⭐⭐</option>
                    <option :value="1">⭐</option>
                  </select>
                </div>
                
                <ion-textarea 
                  v-model="reviewForm.comment" 
                  :rows="3" 
                  placeholder="เขียนรีวิวของคุณ..."
                  :maxlength="150"
                  class="custom-ion-textarea"
                ></ion-textarea>
                
                <div class="char-counter">{{ reviewForm.comment.length }}/150</div>
                
                <div class="form-actions">
                  <ion-button fill="outline" class="btn-cancel" @click="isEditingReview = false" style="--color: #3b2b26; --border-color: #eaddd3; margin: 0; flex: 1;">ยกเลิก</ion-button>
                  <ion-button class="btn-submit-review" @click="saveEditedReview" :disabled="isSubmittingReview" style="--background: #C89F8A; margin: 0; flex: 2;">
                    <ion-spinner v-if="isSubmittingReview" name="dots"></ion-spinner>
                    <span v-else>บันทึกการแก้ไข</span>
                  </ion-button>
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
                  <option :value="5">⭐⭐⭐⭐⭐</option>
                  <option :value="4">⭐⭐⭐⭐</option>
                  <option :value="3">⭐⭐⭐</option>
                  <option :value="2">⭐⭐</option>
                  <option :value="1">⭐</option>
                </select>
              </div>

              <ion-textarea 
                v-model="reviewForm.comment" 
                :rows="3" 
                placeholder="เขียนรีวิวของคุณ..."
                :maxlength="150"
                class="custom-ion-textarea"
              ></ion-textarea>
              
              <div class="char-counter">{{ reviewForm.comment.length }}/150</div>

              <ion-button expand="block" @click="submitReview" :disabled="isSubmittingReview" style="--background: #C89F8A; --border-radius: 12px; height: 48px; font-weight: bold;">
                 <ion-spinner v-if="isSubmittingReview" name="dots"></ion-spinner>
                 <span v-else>ส่งรีวิว</span>
              </ion-button>
            </div>

            <div v-if="reviews.length === 0" class="no-reviews">ยังไม่มีรีวิวสำหรับช่างท่านนี้</div>

            <div v-for="rev in paginatedReviews" :key="rev.id" class="review-card">
              <div class="rev-header" style="justify-content: space-between;">
                <div style="display: flex; align-items: center; gap: 12px;">
                  <img :src="rev.customerProfile" class="rev-avatar" />
                  <div class="rev-name">
                    <span>{{ rev.customerName }}</span>
                    <span class="stars">{{ '⭐'.repeat(rev.rating) }}</span>
                  </div>
                </div>
                
                <button v-if="currentUserRole === 'admin'" class="btn-delete-admin" @click="deleteReviewByAdmin(rev.id)">
                  ลบ
                </button>
              </div>

              <p class="rev-comment">"{{ rev.comment }}"</p>
              <small v-if="rev.updatedAt" class="edited-timestamp">
                แก้ไขแล้ว {{ formatEditedTime(rev.updatedAt) }}
              </small>
            </div>

            <div v-if="totalPages > 1" class="pagination-wrapper">
              <button 
                class="page-btn" 
                @click="prevPage" 
                :disabled="currentPage === 1"
              >
                &lt;
              </button>
              
              <span class="page-info">{{ currentPage }} / {{ totalPages }}</span>
              
              <button 
                class="page-btn" 
                @click="nextPage" 
                :disabled="currentPage === totalPages"
              >
                &gt;
              </button>
            </div>

          </div>
        </div>

        <div v-if="showAuthModal" class="modal-overlay" @click.self="showAuthModal = false">
          <div class="modal-box">
            <h3>กรุณาสร้างบัญชีหรือเข้าสู่ระบบ<br>เพื่อพูดคุยกับ Service Provider</h3>
            <div class="modal-actions">
              <ion-button @click="router.push('/login')" expand="block" style="--background: #C89F8A; margin-bottom: 10px;">Sign In</ion-button>
              <ion-button fill="outline" @click="router.push('/register')" expand="block" style="--color: #3b2b26; --border-color: #ccc;">Sign Up</ion-button>
            </div>
            <button class="close-btn" @click="showAuthModal = false" style="background: none; border: none; color: #888; text-decoration: underline; margin-top: 10px;">ปิด</button>
          </div>
        </div>

      </div>
    </ion-content>
  </ion-page>
</template>

<style scoped>
.custom-ion-textarea {
  --padding-start: 12px;
  --padding-end: 12px;
  --padding-top: 12px;
  --padding-bottom: 12px;
  --background: #faf8f5;
  border: 1px solid #e0d8d0;
  border-radius: 12px;
  margin-bottom: 10px;
  font-size: 14px;
}
.custom-ion-textarea.ion-focused {
  border-color: #C89F8A;
}

.pagination-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 20px;
  margin-top: 30px;
  padding-top: 20px;
  border-top: 1px solid rgba(0,0,0,0.05);
}

.page-btn {
  background: #C89F8A;
  color: white;
  border: none;
  border-radius: 50%;
  width: 40px;
  height: 40px;
  font-size: 18px;
  font-weight: bold;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  box-shadow: 0 4px 10px rgba(200, 159, 138, 0.3);
}

.page-btn:hover:not(:disabled) {
  background: #b8937f;
  transform: translateY(-2px);
}

.page-btn:disabled {
  background: #e0d8d0;
  color: #a39c97;
  cursor: not-allowed;
  box-shadow: none;
  transform: none;
}

.page-info {
  font-size: 16px;
  font-weight: 700;
  color: #3b2b26;
  min-width: 60px;
  text-align: center;
}

.btn-delete-admin {
  background: #ffebee;
  color: #d32f2f;
  border: none;
  padding: 6px 12px;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  transition: 0.2s;
}
.btn-delete-admin:hover {
  background: #ffcdd2;
}
</style>