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

const searchKeyword = ref('');

const selectedRoles = ref<string[]>(['makeup', 'photographer']); 
const minPrice = ref<number | null>(null);
const maxPrice = ref<number | null>(null);
const selectedProvinces = ref<string[]>([]);
const provinces = ['กรุงเทพมหานคร', 'เชียงใหม่', 'ขอนแก่น', 'ชลบุรี', 'ภูเก็ต', 'นครราชสีมา'];

const activeFilters = ref({
  roles: ['makeup', 'photographer'],
  minPrice: null as number | null,
  maxPrice: null as number | null,
  provinces: [] as string[]
});

// ================= Functions =================

// ดึงข้อมูลจาก Firestore
const fetchProviders = async () => {
  isLoading.value = true;
  try {
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

// นำค่าจากฟอร์มมากด Apply 
const applyFilter = () => {
  activeFilters.value = {
    roles: [...selectedRoles.value],
    minPrice: minPrice.value,
    maxPrice: maxPrice.value,
    provinces: [...selectedProvinces.value]
  };
  showFilter.value = false; // ปิดกล่อง Filter
};

// เคลียร์ค่า Filter ทั้งหมด
const clearFilter = () => {
  selectedRoles.value = ['makeup', 'photographer'];
  minPrice.value = null;
  maxPrice.value = null;
  selectedProvinces.value = [];
  applyFilter(); // นำค่าว่างไป Apply ทันที
};

// กรองข้อมูลบน Frontend โดยอิงจาก "activeFilters" แทน
const filteredProviders = computed(() => {
  return providers.value.filter((p) => {
    const info = p.provider_info || {};
    
    const matchKeyword = p.full_name?.toLowerCase().includes(searchKeyword.value.toLowerCase()) || 
                         info.specialty?.toLowerCase().includes(searchKeyword.value.toLowerCase());
    
    const matchRole = activeFilters.value.roles.includes(info.service_type);
    
    const matchLocation = activeFilters.value.provinces.length === 0 || activeFilters.value.provinces.includes(info.location);
    
    const price = info.price_start || 0;
    const matchMinPrice = activeFilters.value.minPrice ? price >= activeFilters.value.minPrice : true;
    const matchMaxPrice = activeFilters.value.maxPrice ? price <= activeFilters.value.maxPrice : true;

    return matchKeyword && matchRole && matchLocation && matchMinPrice && matchMaxPrice;
  });
});

onMounted(() => {
  // รับค่ามาจากหน้าแรก
  if (route.query.role) {
    selectedRoles.value = [route.query.role as string];
    activeFilters.value.roles = [route.query.role as string];
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

        <div class="filter-actions">
          <button class="btn-clear" @click="clearFilter">ล้างค่า</button>
          <button class="btn-apply" @click="applyFilter">นำไปใช้</button>
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
              <span>💼 Sold {{ provider.provider_info?.sold_count || 0 }}</span>
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
.search-bar input { flex: 1; padding: 10px; border: 1px solid #ccc; border-radius: 8px; font-family: inherit;}
.filter-toggle { padding: 10px; background: #f0f2f5; border: none; border-radius: 8px; cursor: pointer; font-weight: bold; }

.filter-dropdown { margin-top: 15px; padding: 15px; background: #fafafa; border-radius: 8px; border: 1px solid #eee; text-align: left; }
.filter-dropdown h4 { margin: 10px 0 5px 0; font-size: 14px; color: #555; }
.price-range { display: flex; align-items: center; gap: 10px; }
.price-range input { width: 80px; padding: 5px; font-family: inherit; border: 1px solid #ccc; border-radius: 4px;}
.province-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 5px; font-size: 14px;}

/* CSS ปุ่มใน Filter */
.filter-actions { display: flex; gap: 10px; margin-top: 20px; }
.btn-clear { flex: 1; padding: 10px; background: transparent; border: 1px solid #ccc; border-radius: 8px; font-weight: bold; cursor: pointer; color: #555; font-size: 14px; }
.btn-apply { flex: 1; padding: 10px; background: #333; border: none; border-radius: 8px; font-weight: bold; cursor: pointer; color: white; font-size: 14px;}

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