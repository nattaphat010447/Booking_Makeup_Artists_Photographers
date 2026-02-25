<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import Navbar from '../components/layout/Navbar.vue';
import { db } from '../config/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';

const route = useRoute();
const router = useRouter();

// ================= State =================
const providers = ref<any[]>([]);
const isLoading = ref(true);
const showFilter = ref(false);

// Filter State
const searchKeyword = ref('');
const selectedRoles = ref<string[]>(['makeup', 'photographer']); // Default เลือก 2 อัน
const minPrice = ref<number | null>(null);
const maxPrice = ref<number | null>(null);

// ลิสต์จังหวัดชั่วคราว (เหมือนใน Register)
const provinces = ['กรุงเทพมหานคร', 'เชียงใหม่', 'ขอนแก่น', 'ชลบุรี', 'ภูเก็ต', 'นครราชสีมา'];
const selectedProvinces = ref<string[]>([]);

// ================= Functions =================
// 1. ดึงข้อมูลจาก Firestore แบบดิบๆ ก่อน (เพราะ NoSQL กรองหลายเงื่อนไขซับซ้อนยาก)
const fetchProviders = async () => {
  isLoading.value = true;
  try {
    // ดึงทุกคนที่เป็น Provider
    const q = query(collection(db, 'users'), where('role', '==', 'provider'));
    const querySnapshot = await getDocs(q);
    
    let fetchedData: any[] = [];
    querySnapshot.forEach((doc) => {
      fetchedData.push({ id: doc.id, ...doc.data() });
    });
    providers.value = fetchedData;
  } catch (error) {
    console.error("Error fetching providers: ", error);
  } finally {
    isLoading.value = false;
  }
};

// 2. Client-side Filtering (คำนวณการกรองบน Frontend)
const filteredProviders = computed(() => {
  return providers.value.filter((p) => {
    const info = p.provider_info || {};
    
    // กรอง Keyword (ชื่อ หรือ ประเภทงาน)
    const matchKeyword = p.full_name?.toLowerCase().includes(searchKeyword.value.toLowerCase()) || 
                         info.specialty?.toLowerCase().includes(searchKeyword.value.toLowerCase());
    
    // กรอง Role
    const matchRole = selectedRoles.value.includes(info.service_type);
    
    // กรอง จังหวัด (ถ้าไม่ได้เลือกจังหวัดเลย ถือว่าผ่าน)
    const matchLocation = selectedProvinces.value.length === 0 || selectedProvinces.value.includes(info.location);
    
    // กรอง ราคา
    const price = info.price_start || 0;
    const matchMinPrice = minPrice.value ? price >= minPrice.value : true;
    const matchMaxPrice = maxPrice.value ? price <= maxPrice.value : true;

    return matchKeyword && matchRole && matchLocation && matchMinPrice && matchMaxPrice;
  });
});

// อ่านค่า Query Params จากหน้าแรก (ถ้ากดปุ่มมาจาก Hero Section)
onMounted(() => {
  if (route.query.role) {
    selectedRoles.value = [route.query.role as string];
  }
  fetchProviders();
});
</script>

<template>
  <div class="page-container">
    <Navbar />

    <div class="search-header">
      <div class="search-bar">
        <input v-model="searchKeyword" type="text" placeholder="ค้นหาชื่อ, สไตล์งาน..." />
        <button class="filter-toggle" @click="showFilter = !showFilter">⚙️ Filter</button>
      </div>

      <div v-if="showFilter" class="filter-dropdown">
        <h4>ประเภทช่าง</h4>
        <label><input type="checkbox" value="makeup" v-model="selectedRoles"> ช่างแต่งหน้า</label>
        <label><input type="checkbox" value="photographer" v-model="selectedRoles"> ช่างภาพ</label>

        <h4>ช่วงราคา (บาท)</h4>
        <div class="price-range">
          <input type="number" v-model="minPrice" placeholder="Min" /> - 
          <input type="number" v-model="maxPrice" placeholder="Max" />
        </div>

        <h4>จังหวัด</h4>
        <div class="province-grid">
          <label v-for="prov in provinces" :key="prov">
            <input type="checkbox" :value="prov" v-model="selectedProvinces"> {{ prov }}
          </label>
        </div>
      </div>
    </div>

    <div class="provider-list">
      <div v-if="isLoading" class="loading">กำลังโหลดข้อมูล...</div>
      <div v-else-if="filteredProviders.length === 0" class="empty">ไม่พบช่างที่ตรงกับเงื่อนไข</div>
      
      <div v-for="provider in filteredProviders" :key="provider.id" class="provider-card" @click="router.push(`/provider/${provider.id}`)">
        <img :src="provider.provider_info?.portfolios?.[0] || 'https://via.placeholder.com/390x200'" class="cover-img" />
        
        <div class="card-body">
          <div class="specialty">{{ provider.provider_info?.specialty || 'รับงานทั่วไป' }}</div>
          
          <div class="row-info">
            <span class="role-badge">{{ provider.provider_info?.service_type === 'makeup' ? '💄 ช่างแต่งหน้า' : '📸 ช่างภาพ' }}</span>
            <span class="price">เริ่มต้น {{ provider.provider_info?.price_start || 0 }} ฿</span>
          </div>

          <div class="row-info bottom-row">
            <div class="user-info">
              <img :src="provider.profile_image || 'https://via.placeholder.com/40'" class="avatar" />
              <span class="name">{{ provider.full_name }}</span>
            </div>
            <div class="stats">
              <span>💼 Sold 0</span>
              <span>⭐ {{ provider.provider_info?.rating_avg || '0.0' }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

  </div>
</template>

<style scoped>
.page-container { display: flex; flex-direction: column; min-height: 100vh; background: #f9f9f9;}
.search-header { padding: 15px; background: white; border-bottom: 1px solid #ddd; }
.search-bar { display: flex; gap: 10px; }
.search-bar input { flex: 1; padding: 10px; border: 1px solid #ccc; border-radius: 8px; }
.filter-toggle { padding: 10px; background: #f0f2f5; border: none; border-radius: 8px; cursor: pointer; font-weight: bold; }

.filter-dropdown { margin-top: 15px; padding: 15px; background: #fafafa; border-radius: 8px; border: 1px solid #eee; text-align: left; }
.filter-dropdown h4 { margin: 10px 0 5px 0; font-size: 14px; color: #555; }
.price-range { display: flex; align-items: center; gap: 10px; }
.price-range input { width: 80px; padding: 5px; }
.province-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 5px; font-size: 14px;}

.provider-list { padding: 15px; display: flex; flex-direction: column; gap: 15px; padding-bottom: 50px;}
.provider-card { background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.05); cursor: pointer; text-align: left;}
.cover-img { width: 100%; height: 200px; object-fit: cover; }
.card-body { padding: 15px; }
.specialty { font-weight: bold; font-size: 16px; margin-bottom: 8px; }
.row-info { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
.role-badge { background: #e3f2fd; color: #1976d2; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: bold; }
.price { font-weight: bold; color: #e53935; }
.bottom-row { margin-bottom: 0; padding-top: 10px; border-top: 1px solid #eee; }
.user-info { display: flex; align-items: center; gap: 10px; }
.avatar { width: 30px; height: 30px; border-radius: 50%; object-fit: cover; }
.name { font-size: 14px; font-weight: bold; color: #333; }
.stats { font-size: 12px; color: #666; display: flex; gap: 10px; }
.loading, .empty { text-align: center; padding: 40px; color: #888; }
</style>