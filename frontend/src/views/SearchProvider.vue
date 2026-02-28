
<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue';
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
const provinces = ['กระบี่', 'กาญจนบุรี', 'กาฬสินธุ์', 'กำแพงเพชร', 'ขอนแก่น', 'จันทบุรี', 'ฉะเชิงเทรา', 'ชลบุรี', 'ชัยนาท', 'ชัยภูมิ', 'ชุมพร', 'เชียงราย', 'เชียงใหม่', 'ตรัง', 'ตราด', 'ตาก', 'นครนายก', 'นครปฐม', 'นครพนม', 'นครราชสีมา', 'นครศรีธรรมราช', 'นครสวรรค์', 'นนทบุรี', 'นราธิวาส', 'น่าน', 'บึงกาฬ', 'บุรีรัมย์', 'ปทุมธานี', 'ประจวบคีรีขันธ์', 'ปราจีนบุรี', 'ปัตตานี', 'พระนครศรีอยุธยา', 'พะเยา', 'พังงา', 'พัทลุง', 'พิจิตร', 'พิษณุโลก', 'เพชรบุรี', 'เพชรบูรณ์', 'แพร่', 'ภูเก็ต', 'มหาสารคาม', 'มุกดาหาร', 'แม่ฮ่องสอน', 'ยโสธร', 'ยะลา', 'ร้อยเอ็ด', 'ระนอง', 'ระยอง', 'ราชบุรี', 'ลพบุรี', 'ลำปาง', 'ลำพูน', 'เลย', 'ศรีสะเกษ', 'สกลนคร', 'สงขลา', 'สตูล', 'สมุทรปราการ', 'สมุทรสงคราม', 'สมุทรสาคร', 'สระแก้ว', 'สระบุรี', 'สิงห์บุรี', 'สุโขทัย', 'สุพรรณบุรี', 'สุราษฎร์ธานี', 'สุรินทร์', 'หนองคาย', 'หนองบัวลำภู', 'อ่างทอง', 'อำนาจเจริญ', 'อุดรธานี', 'อุตรดิตถ์', 'อุทัยธานี', 'อุบลราชธานี', 'เทศบาลตำบลอุโมงค์', 'นครราชสีมา', 'กรุงเทพมหานคร']

const activeFilters = ref({
  roles: ['makeup', 'photographer'],
  minPrice: null as number | null,
  maxPrice: null as number | null,
  provinces: [] as string[]
});

// ================= สำหรับค้นหาจังหวัด =================
const provinceSearch = ref('');
const isProvinceDropdownOpen = ref(false);
const provinceContainerRef = ref<HTMLElement | null>(null);

const handleClickOutside = (event: MouseEvent) => {
  if (
    provinceContainerRef.value && 
    !provinceContainerRef.value.contains(event.target as Node)
  ) {
    isProvinceDropdownOpen.value = false; // ถ้าคลิกนอกกล่อง ให้ปิด Dropdown
  }
};

const filteredProvincesList = computed(() => {
  const keyword = provinceSearch.value.trim().toLowerCase();
  return provinces.filter(p => 
    p.toLowerCase().includes(keyword) && !selectedProvinces.value.includes(p)
  );
});

// ================= Functions =================

const selectProvince = (prov: string) => {
  if (!selectedProvinces.value.includes(prov)) {
    selectedProvinces.value.push(prov);
  }
  provinceSearch.value = ''; 
  isProvinceDropdownOpen.value = false; 
};

const removeProvince = (prov: string) => {
  selectedProvinces.value = selectedProvinces.value.filter(p => p !== prov);
};

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

const applyFilter = () => {
  activeFilters.value = {
    roles: [...selectedRoles.value],
    minPrice: minPrice.value,
    maxPrice: maxPrice.value,
    provinces: [...selectedProvinces.value]
  };
  showFilter.value = false; 
};

const clearFilter = () => {
  selectedRoles.value = ['makeup', 'photographer'];
  minPrice.value = null;
  maxPrice.value = null;
  selectedProvinces.value = [];
  applyFilter(); 
};

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
  if (route.query.role) {
    selectedRoles.value = [route.query.role as string];
    activeFilters.value.roles = [route.query.role as string];
  }
  fetchProviders();

  document.addEventListener('click', handleClickOutside); 
});

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside);
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

        <h4>จังหวัดที่รับงาน</h4>
        <div class="province-search-container" ref="provinceContainerRef"> 
          <input 
            type="text" 
            v-model="provinceSearch" 
            placeholder="พิมพ์ชื่อจังหวัดเพื่อค้นหา..." 
            @focus="isProvinceDropdownOpen = true" 
            @blur="setTimeout(() => isProvinceDropdownOpen = false, 200)"
            />
          
          <div v-if="isProvinceDropdownOpen && filteredProvincesList.length > 0" class="province-dropdown">
            <div 
              v-for="prov in filteredProvincesList" 
              :key="prov" 
              class="dropdown-item"
              @click="selectProvince(prov)"
            >
              {{ prov }}
            </div>
          </div>
        </div>

        <div class="selected-tags" v-if="selectedProvinces.length > 0">
          <span v-for="prov in selectedProvinces" :key="prov" class="tag">
            {{ prov }}
            <button type="button" class="remove-tag" @click="removeProvince(prov)">✕</button>
          </span>
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