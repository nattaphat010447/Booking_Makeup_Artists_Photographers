<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import Navbar from '../components/layout/Navbar.vue';
import { db, auth } from '../config/firebase';
import { collection, getDocs, doc, updateDoc, deleteDoc, query, where  } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { IonPage, IonContent, IonSegment, IonSegmentButton, IonLabel, IonSpinner } from '@ionic/vue';

const router = useRouter();
const isLoading = ref(true);
const currentTab = ref('stats'); // แท็บเริ่มต้น: stats, users, reviews

// State เก็บข้อมูล
const users = ref<any[]>([]);
const reviews = ref<any[]>([]);

// ฟังก์ชันตรวจสอบสิทธิ์ก่อนเข้าหน้า Admin
onMounted(() => {
  onAuthStateChanged(auth, async (user) => {
    if (user) {
      const userDoc = await getDocs(query(collection(db, 'users'), where('__name__', '==', user.uid)));
      if (!userDoc.empty && userDoc.docs[0]?.data()?.role === 'admin') {
        fetchAllData();
      } else {
        alert('คุณไม่มีสิทธิ์เข้าถึงหน้านี้');
        router.push('/');
      }
    } else {
      router.push('/login');
    }
  });
});

const fetchAllData = async () => {
  isLoading.value = true;
  try {
    // 1. ดึง Users ทั้งหมด
    const usersSnap = await getDocs(collection(db, 'users'));
    users.value = usersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    // 2. ดึง Reviews ทั้งหมด
    const reviewsSnap = await getDocs(collection(db, 'reviews'));
    reviews.value = reviewsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
  } catch (error) {
    console.error('Error fetching admin data:', error);
  } finally {
    isLoading.value = false;
  }
};

// ================= Actions: จัดการ Users =================
const changeUserRole = async (userId: string, currentRole: string) => {
  const newRole = prompt('พิมพ์ Role ที่ต้องการเปลี่ยน:', currentRole);
  if (newRole && ['customer', 'provider', 'admin'].includes(newRole)) {
    try {
      await updateDoc(doc(db, 'users', userId), { role: newRole });
      alert('อัปเดต Role สำเร็จ!');
      fetchAllData(); // โหลดข้อมูลใหม่
    } catch (error) {
      alert('เกิดข้อผิดพลาดในการอัปเดต');
    }
  } else if (newRole) {
    alert('Role ไม่ถูกต้อง (ต้องเป็น customer, provider หรือ admin เท่านั้น)');
  }
};

const deleteUser = async (userId: string) => {
  if (confirm('⚠️ แน่ใจหรือไม่ที่จะลบผู้ใช้นี้ออกจากระบบ? (การลบใน Firestore)')) {
    try {
      await deleteDoc(doc(db, 'users', userId));
      alert('ลบผู้ใช้งานสำเร็จ');
      fetchAllData();
    } catch (error) {
      alert('เกิดข้อผิดพลาดในการลบผู้ใช้งาน');
    }
  }
};

// ================= Actions: จัดการ Reviews =================
const deleteReviewAdmin = async (reviewId: string) => {
  if (confirm('🗑️ แน่ใจหรือไม่ที่จะลบรีวิวนี้?')) {
    try {
      await deleteDoc(doc(db, 'reviews', reviewId));
      alert('ลบรีวิวสำเร็จ');
      fetchAllData();
    } catch (error) {
      alert('เกิดข้อผิดพลาดในการลบรีวิว');
    }
  }
};
</script>

<template>
  <ion-page>
    <Navbar />

    <div class="admin-header">
      <ion-segment v-model="currentTab" class="custom-segment">
        <ion-segment-button value="stats">
          <ion-label>📊 สถิติ</ion-label>
        </ion-segment-button>
        <ion-segment-button value="users">
          <ion-label>👥 จัดการผู้ใช้</ion-label>
        </ion-segment-button>
        <ion-segment-button value="reviews">
          <ion-label>⭐ รีวิว</ion-label>
        </ion-segment-button>
      </ion-segment>
    </div>

    <ion-content class="admin-content">
      <div v-if="isLoading" class="loading">
        <ion-spinner name="crescent" color="medium"></ion-spinner>
        <p>กำลังโหลดข้อมูลระบบ...</p>
      </div>

      <div v-else class="container">
        
        <div v-if="currentTab === 'stats'" class="tab-content">
          <h2>ภาพรวมระบบ (Overview)</h2>
          <div class="stats-grid">
            <div class="stat-card">
              <h3>ผู้ใช้งานทั้งหมด</h3>
              <div class="number">{{ users.length }}</div>
            </div>
            <div class="stat-card">
              <h3>ลูกค้า (Customers)</h3>
              <div class="number">{{ users.filter(u => u.role === 'customer').length }}</div>
            </div>
            <div class="stat-card">
              <h3>ช่าง (Providers)</h3>
              <div class="number">{{ users.filter(u => u.role === 'provider').length }}</div>
            </div>
            <div class="stat-card">
              <h3>แอดมิน (Admins)</h3>
              <div class="number">{{ users.filter(u => u.role === 'admin').length }}</div>
            </div>
            <div class="stat-card highlight">
              <h3>รีวิวในระบบทั้งหมด</h3>
              <div class="number">{{ reviews.length }}</div>
            </div>
          </div>
        </div>

        <div v-if="currentTab === 'users'" class="tab-content">
          <h2>รายชื่อผู้ใช้งาน ({{ users.length }})</h2>
          
          <div class="table-responsive">
            <table class="admin-table">
              <thead>
                <tr>
                  <th>รูป</th>
                  <th>ชื่อ-นามสกุล</th>
                  <th>อีเมล</th>
                  <th>บทบาท (Role)</th>
                  <th>การจัดการ</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="u in users" :key="u.id">
                  <td><img :src="u.profile_image || 'https://via.placeholder.com/40'" class="avatar-sm" /></td>
                  <td class="fw-bold">{{ u.full_name }}</td>
                  <td>{{ u.email }}</td>
                  <td>
                    <span class="role-badge" :class="u.role">{{ u.role }}</span>
                  </td>
                  <td>
                    <div class="action-buttons">
                      <button class="btn-edit" @click="changeUserRole(u.id, u.role)">เปลี่ยน Role</button>
                      <button class="btn-delete" @click="deleteUser(u.id)" :disabled="u.role === 'admin'">ลบ</button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div v-if="currentTab === 'reviews'" class="tab-content">
          <h2>ตรวจสอบรีวิว ({{ reviews.length }})</h2>

          <div class="table-responsive">
            <table class="admin-table">
              <thead>
                <tr>
                  <th>ผู้รีวิว</th>
                  <th>คะแนน</th>
                  <th>ข้อความคอมเมนต์</th>
                  <th>การจัดการ</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="rev in reviews" :key="rev.id">
                  <td>
                    <div class="flex-align">
                      <img :src="rev.customerProfile" class="avatar-sm" />
                      <span>{{ rev.customerName }}</span>
                    </div>
                  </td>
                  <td style="color: #f5b041; font-size: 14px;">{{ '⭐'.repeat(rev.rating) }}</td>
                  <td class="comment-col">"{{ rev.comment }}"</td>
                  <td>
                    <button class="btn-delete" @click="deleteReviewAdmin(rev.id)">ลบทิ้ง</button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </ion-content>
  </ion-page>
</template>

<style scoped>
.admin-header {
  background: white;
  padding: 10px 20px;
  border-bottom: 1px solid rgba(0,0,0,0.05);
  position: sticky;
  top: 0;
  z-index: 10;
}
.custom-segment {
  --background: #faf8f5;
}

.admin-content {
  --background: #FAFAFA;
}
.container {
  padding: 24px;
  max-width: 1200px;
  margin: 0 auto;
}
.loading { text-align: center; padding: 60px 20px; color: #888; }

.tab-content h2 { margin-top: 0; color: #3b2b26; font-size: 22px; font-weight: 700; margin-bottom: 24px;}

/* Stats Grid */
.stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; }
.stat-card { background: white; padding: 24px; border-radius: 16px; box-shadow: 0 4px 15px rgba(0,0,0,0.03); border: 1px solid rgba(0,0,0,0.04); text-align: center;}
.stat-card h3 { margin: 0; font-size: 15px; color: #888; font-weight: 500;}
.stat-card .number { font-size: 36px; font-weight: 800; color: #3b2b26; margin-top: 10px;}
.stat-card.highlight { background: #C89F8A; }
.stat-card.highlight h3, .stat-card.highlight .number { color: white; }

/* Table Styles */
.table-responsive { overflow-x: auto; background: white; border-radius: 16px; box-shadow: 0 4px 15px rgba(0,0,0,0.03); border: 1px solid rgba(0,0,0,0.04); padding: 16px;}
.admin-table { width: 100%; border-collapse: collapse; text-align: left; font-size: 14px;}
.admin-table th { padding: 16px; border-bottom: 2px solid #eee; color: #888; font-weight: 600;}
.admin-table td { padding: 16px; border-bottom: 1px solid #f9f9f9; color: #444; vertical-align: middle;}
.admin-table tr:hover { background-color: #faf8f5; }

.avatar-sm { width: 36px; height: 36px; border-radius: 50%; object-fit: cover; }
.flex-align { display: flex; align-items: center; gap: 10px; }
.fw-bold { font-weight: 600; color: #3b2b26;}
.comment-col { max-width: 300px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-style: italic;}

/* Badges & Buttons */
.role-badge { padding: 6px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; text-transform: uppercase;}
.role-badge.customer { background: #e3f2fd; color: #1976d2; }
.role-badge.provider { background: #f3e5f5; color: #8e24aa; }
.role-badge.admin { background: #ffebee; color: #d32f2f; }

.action-buttons { display: flex; gap: 8px; }
.btn-edit { background: #C89F8A; color: white; border: none; padding: 6px 12px; border-radius: 8px; cursor: pointer; font-size: 12px; font-weight: 600;}
.btn-delete { background: #fee2e2; color: #d32f2f; border: none; padding: 6px 12px; border-radius: 8px; cursor: pointer; font-size: 12px; font-weight: 600;}
.btn-delete:disabled { opacity: 0.5; cursor: not-allowed; }
</style>