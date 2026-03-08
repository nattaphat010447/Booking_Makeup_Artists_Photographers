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

const goBack = () => {
  router.back();
};

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
      alert('No information was found for this service provider.');
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
    
    canReview.value = snap.docs.some(document => document.data().data?.status === 'completed');
  } catch (error) { 
    console.error(error); 
  }
};

const handleChatClick = () => {
  if (isLoggedIn.value) router.push(`/chat/${providerId}`);
  else showAuthModal.value = true;
};

const submitReview = async () => {
  if (!reviewForm.value.comment.trim()) { alert('Please fill in your review text'); return; }
  isSubmittingReview.value = true;
  try {
    const myDoc = await getDoc(doc(db, 'users', currentUser.value.uid));
    const myData = myDoc.exists() ? myDoc.data() : { full_name: 'User', profile_image: '' };

    const newReview = {
      providerId: providerId, customerId: currentUser.value.uid,
      customerName: myData.full_name, customerProfile: myData.profile_image || 'https://via.placeholder.com/40',
      rating: reviewForm.value.rating, comment: reviewForm.value.comment, createdAt: serverTimestamp()
    };
    await addDoc(collection(db, 'reviews'), newReview);
    
    await addDoc(collection(db, 'notifications'), {
      userId: providerId, type: 'review', title: 'You have a new review!',
      message: `Customer ${myData.full_name} has written a review and rated you ${reviewForm.value.rating} stars`,
      isRead: false, createdAt: serverTimestamp(), link: `/provider/${providerId}`
    });
    
    await updateProviderRating();
    reviewForm.value.comment = ''; canReview.value = false; 
    await fetchReviews(); await fetchProvider();
  } catch (error) { alert('An error occurred while submitting the review'); } 
  finally { isSubmittingReview.value = false; }
};

const startEditReview = () => {
  reviewForm.value.rating = myReview.value.rating;
  reviewForm.value.comment = myReview.value.comment;
  isEditingReview.value = true;
};

const saveEditedReview = async () => {
  if (!reviewForm.value.comment.trim()) { alert('Please fill in your review text'); return; }
  isSubmittingReview.value = true;
  try {
    await updateDoc(doc(db, 'reviews', myReview.value.id), {
      rating: reviewForm.value.rating, comment: reviewForm.value.comment, updatedAt: serverTimestamp() 
    });
    await updateProviderRating();
    alert('Review updated successfully!');
    isEditingReview.value = false; reviewForm.value.comment = '';
    await fetchReviews(); await fetchProvider();
  } catch (error) { alert('An error occurred while editing the review'); } 
  finally { isSubmittingReview.value = false; }
};

const deleteReview = async () => {
  if (!confirm('Are you sure you want to delete this review?')) return;
  try {
    await deleteDoc(doc(db, 'reviews', myReview.value.id));
    await updateProviderRating();
    alert('Review deleted successfully!');
    hasReviewed.value = false; myReview.value = null; isEditingReview.value = false;
    await checkCanReview(currentUser.value.uid); await fetchReviews(); await fetchProvider();
  } catch (error) { alert('An error occurred while deleting the review'); }
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
  if (!confirm('Do you need administrator privileges to confirm the deletion of this review?')) return;
  try {
    await deleteDoc(doc(db, 'reviews', reviewId));
    await updateProviderRating();
    alert('Admin deleted review successfully!');
    await fetchReviews(); 
    await fetchProvider();
  } catch (error) {
    console.error('Error deleting review:', error);
    alert('An error occurred while deleting the review');
  }
};
</script>

<template>
  <ion-page>
    <Navbar />
    <ion-content class="custom-content">
      <div class="back-button" @click="goBack">
      <img src="/images/back.png" class="back-icon" />
    </div>
      <div class="page-container">
        
        <div v-if="isLoading" class="loading">
          <ion-spinner name="crescent" color="medium"></ion-spinner>
          <p>Loading provider data...</p>
        </div>
        
        <div v-else-if="provider" class="content">
          <div class="gallery-section">

            <div class="main-image-wrapper">
              <img 
                :src="mainImage || 'https://via.placeholder.com/390x350'" 
                class="main-image"
              />
            </div>

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
            <h2 class="specialty">{{ provider.provider_info?.specialty || 'Accepting general assignments' }}</h2>
            
            <div class="bio-box">
              <p>{{ provider.provider_info?.bio || 'Service provider has not added a bio yet...' }}</p>
            </div>

            <div class="stats">
              <span class="stat-item">
                <img src="/images/sold.png" class="stat-icon" />
                Sold {{ provider.provider_info?.sold_count || 0 }} ครั้ง
              </span>
              <span class="stat-item">
                <img src="/images/star.png" class="stat-icon" />
                {{ provider.provider_info?.rating_avg ? Number(provider.provider_info.rating_avg).toFixed(1) : '0.0' }}
              </span>
              <div class="price">
              Starting with {{ provider.provider_info?.price_start || 0 }} ฿
            </div>
            </div>

            <div class="profile-row">
              <img :src="provider.profile_image || 'https://via.placeholder.com/50'" class="avatar" />
              <div class="name-info">
                <span class="name">{{ provider.full_name }}</span>
                <span class="role">{{ provider.provider_info?.service_type === 'makeup' ? 'Service Provider' : 'Photographer' }}</span>
              </div>
            </div>

            <ion-button 
              v-if="currentUserRole === 'customer'" 
              @click="handleChatClick" 
              expand="block" 
              style="--background: #3b2b26; --border-radius: 14px; height: 56px; font-weight: bold; font-size: 16px;">
              Chat with Service Provider
            </ion-button>
          </div>

          <div class="reviews-section" ref="reviewsSectionRef">
            <h3>Customer reviews ({{ reviews.length }})</h3>

            <div v-if="hasReviewed && myReview" class="my-review-box">
              <div class="box-header">
                <h4>Your Review</h4>
                <div class="action-links" v-if="!isEditingReview">
                  <span @click="startEditReview" class="link-edit">Edit</span>
                  <span @click="deleteReview" class="link-delete">Delete</span>
                </div>
              </div>

              <div v-if="isEditingReview" class="review-form-box">
                <div class="rating-select">
                  <label>Rate: </label>
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
                  placeholder="Write your review..."
                  :maxlength="150"
                  class="custom-ion-textarea"
                ></ion-textarea>
                
                <div class="char-counter">{{ reviewForm.comment.length }}/150</div>
                
                <div class="form-actions">
                  <ion-button fill="outline" class="btn-cancel" @click="isEditingReview = false" style="--color: #3b2b26; --border-color: #eaddd3; margin: 0; flex: 1;">ยกเลิก</ion-button>
                  <ion-button class="btn-submit-review" @click="saveEditedReview" :disabled="isSubmittingReview" style="--background: #C89F8A; margin: 0; flex: 2;">
                    <ion-spinner v-if="isSubmittingReview" name="dots"></ion-spinner>
                    <span v-else>Save Changes</span>
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
                  Edited on {{ formatEditedTime(myReview.updatedAt) }}
                </small>
              </div>
            </div>

            <div v-else-if="canReview" class="review-form-box">
              <h4>Write your review</h4>
              <div class="rating-select">
                <label>Rate: </label>
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
                placeholder="Write your review..."
                :maxlength="150"
                class="custom-ion-textarea"
              ></ion-textarea>
              
              <div class="char-counter">{{ reviewForm.comment.length }}/150</div>

              <ion-button expand="block" @click="submitReview" :disabled="isSubmittingReview" style="--background: #C89F8A; --border-radius: 12px; height: 48px; font-weight: bold;">
                 <ion-spinner v-if="isSubmittingReview" name="dots"></ion-spinner>
                 <span v-else>Submit Review</span>
              </ion-button>
            </div>

            <div v-if="reviews.length === 0" class="no-reviews">No reviews yet for this provider</div>

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
                  Delete
                </button>
              </div>

              <p class="rev-comment">"{{ rev.comment }}"</p>
              <small v-if="rev.updatedAt" class="edited-timestamp">
                Edited on {{ formatEditedTime(rev.updatedAt) }}
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
            <h3>Please create an account or log in<br>to chat with the Service Provider</h3>
            <div class="modal-actions">
              <ion-button @click="router.push('/login')" expand="block" style="--background: #C89F8A; margin-bottom: 10px;">Sign In</ion-button>
              <ion-button fill="outline" @click="router.push('/register')" expand="block" style="--color: #3b2b26; --border-color: #ccc;">Sign Up</ion-button>
            </div>
            <button class="close-btn" @click="showAuthModal = false" style="background: none; border: none; color: #888; text-decoration: underline; margin-top: 10px;">Close</button>
          </div>
        </div>

      </div>
    </ion-content>
  </ion-page>
</template>
<style scoped>

/* =========================
   Page Layout
========================= */

.page-container{
  max-width:1100px;
  margin:auto;
  padding:24px;
}

.content{
  display:grid;
  grid-template-columns: 420px 1fr;
  gap:40px;
  align-items:start;
}

/* =========================
   Gallery Section
========================= */

.gallery-section{
  width:100%;
}

/* =========================
   Main Image (3:4 FIXED)
========================= */

.main-image-wrapper{
  width:100%;
  aspect-ratio:3 / 4;
  overflow:hidden;
  border-radius:16px;
  background:#f3f3f3;
}

.main-image{
  width:100%;
  height:100%;
  object-fit:cover;
  display:block;
}

/* =========================
   Thumbnail
========================= */

.thumbnail-list{
  display:flex;
  gap:10px;
  margin-top:12px;
  /*flex-wrap:wrap;*/
}

.thumbnail{
  width:70px;
  height:90px;
  object-fit:cover;
  border-radius:8px;
  cursor:pointer;
  border:2px solid transparent;
  transition:0.2s;
}

.thumbnail:hover{
  transform:scale(1.05);
}

.thumbnail.active{
  border-color:#C89F8A;
}

.back-button{
  display:flex;
  align-items:center;
  cursor:pointer;
  margin-top: 10px;
  margin-left: 5%;
}

.back-icon{
  width:32px;
  height:32px;
  object-fit:contain;
}

/* =========================
   Provider Details
========================= */

.details-section{
  display:flex;
  flex-direction:column;
  gap:16px;
}

.specialty{
  font-size:24px;
  font-weight:700;
  color:#3b2b26;
}

/* ===== FIX ตรงนี้ ===== */

.stats{
  display:flex;
  align-items:center;
  gap:18px;
  font-size:14px;
  color:#666;
}

.stat-item{
  display:flex;
  align-items:center;
  gap:6px;
}

.stat-icon{
  width:18px;
  height:18px;
  object-fit:contain;
}

.price{
  margin-left:auto;
  font-size:20px;
  font-weight:700;
  color:#C89F8A;
}

/* =========================
   Bio
========================= */

.bio-box{
  background:#faf8f5;
  padding:16px;
  border-radius:12px;
  line-height:1.6;
}

/* =========================
   Profile Row
========================= */

.profile-row{
  display:flex;
  align-items:center;
  gap:12px;
}

.avatar{
  width:50px;
  height:50px;
  border-radius:50%;
  object-fit:cover;
}

.name-info{
  display:flex;
  flex-direction:column;
}

.name{
  font-weight:700;
}

.role{
  font-size:13px;
  color:#777;
}

/* =========================
   Reviews Section
========================= */

.reviews-section{
  grid-column:1 / -1;
  margin-top:50px;
}

.review-card{
  background:white;
  border:1px solid #eee;
  border-radius:12px;
  padding:16px;
  margin-top:14px;
}

.rev-header{
  display:flex;
  align-items:center;
  gap:12px;
}

.rev-avatar{
  width:40px;
  height:40px;
  border-radius:50%;
  object-fit:cover;
}

.rev-name{
  display:flex;
  flex-direction:column;
}

.stars{
  color:#f5b50a;
  font-size:14px;
}

.rev-comment{
  margin-top:10px;
  line-height:1.6;
}

.edited-timestamp{
  color:#999;
  font-size:12px;
}

/* =========================
   Review Form
========================= */

.review-form-box{
  margin-top:20px;
  background:#faf8f5;
  padding:16px;
  border-radius:12px;
}

.rating-select{
  margin-bottom:10px;
}

.char-counter{
  font-size:12px;
  text-align:right;
  color:#999;
}

/* =========================
   Pagination
========================= */

.pagination-wrapper{
  display:flex;
  justify-content:center;
  align-items:center;
  gap:20px;
  margin-top:30px;
}

.page-btn{
  width:40px;
  height:40px;
  border-radius:50%;
  border:none;
  background:#C89F8A;
  color:white;
  font-size:18px;
  cursor:pointer;
}

.page-btn:disabled{
  background:#ddd;
}

.page-info{
  font-weight:600;
}

/* =========================
   Admin Delete
========================= */

.btn-delete-admin{
  background:#ffebee;
  border:none;
  padding:6px 12px;
  border-radius:8px;
  cursor:pointer;
  color:#d32f2f;
  font-size:12px;
}

/* =========================
   Loading
========================= */

.loading{
  display:flex;
  flex-direction:column;
  align-items:center;
  margin-top:80px;
  gap:10px;
}

/* =========================
   Responsive
========================= */

@media (max-width:900px){

.content{
  grid-template-columns:1fr;
}

.gallery-section{
  max-width:420px;
  margin:auto;
}

.stats{
  flex-wrap:wrap;
}

.price{
  margin-left:0;
}

}

</style>