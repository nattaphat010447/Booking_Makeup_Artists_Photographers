<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import Navbar from '../components/layout/Navbar.vue';
import { db } from '../config/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';

import { IonPage, IonContent, IonInput, IonButton, IonSpinner, IonRefresher, IonRefresherContent } from '@ionic/vue';

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
const provinces = [
'Krabi',
'Kanchanaburi',
'Kalasin',
'Kamphaeng Phet',
'Khon Kaen',
'Chanthaburi',
'Chachoengsao',
'Chonburi',
'Chainat',
'Chaiyaphum',
'Chumphon',
'Chiang Rai',
'Chiang Mai',
'Trang',
'Trat',
'Tak',
'Nakhon Nayok',
'Nakhon Pathom',
'Nakhon Phanom',
'Nakhon Ratchasima',
'Nakhon Si Thammarat',
'Nakhon Sawan',
'Nonthaburi',
'Narathiwat',
'Nan',
'Bueng Kan',
'Buriram',
'Pathum Thani',
'Prachuap Khiri Khan',
'Prachinburi',
'Pattani',
'Phra Nakhon Si Ayutthaya',
'Phayao',
'Phang Nga',
'Phatthalung',
'Phichit',
'Phitsanulok',
'Phetchaburi',
'Phetchabun',
'Phrae',
'Phuket',
'Maha Sarakham',
'Mukdahan',
'Mae Hong Son',
'Yasothon',
'Yala',
'Roi Et',
'Ranong',
'Rayong',
'Ratchaburi',
'Lopburi',
'Lampang',
'Lamphun',
'Loei',
'Sisaket',
'Sakon Nakhon',
'Songkhla',
'Satun',
'Samut Prakan',
'Samut Songkhram',
'Samut Sakhon',
'Sa Kaeo',
'Saraburi',
'Sing Buri',
'Sukhothai',
'Suphan Buri',
'Surat Thani',
'Surin',
'Nong Khai',
'Nong Bua Lamphu',
'Ang Thong',
'Amnat Charoen',
'Udon Thani',
'Uttaradit',
'Uthai Thani',
'Ubon Ratchathani',
'Bangkok'
];

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
  if (provinceContainerRef.value && !provinceContainerRef.value.contains(event.target as Node)) {
    isProvinceDropdownOpen.value = false;
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

const fetchProviders = async (isRefresh = false) => {
  if (!isRefresh) isLoading.value = true; 
  
  try {
    const q = query(collection(db, 'users'), where('role', '==', 'provider'));
    const querySnapshot = await getDocs(q);
    let fetchedData: any[] = [];
    
    // ดึงเฉพาะข้อมูลจริงจาก DB
    querySnapshot.forEach((doc) => {
      fetchedData.push({ id: doc.id, ...doc.data() });
    });

    // เรียงลำดับจากช่างที่สมัครใหม่สุด (ถ้ามี created_at)
    fetchedData.sort((a, b) => {
      const timeA = a.created_at?.toMillis ? a.created_at.toMillis() : 0;
      const timeB = b.created_at?.toMillis ? b.created_at.toMillis() : 0;
      return timeB - timeA; 
    });

    providers.value = fetchedData;
  } catch (error) {
    console.error("Error fetching providers: ", error);
  } finally {
    isLoading.value = false;
  }
};

const handleRefresh = (event: any) => {
  fetchProviders(true).then(() => {
    event.target.complete();
  });
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

const closeProvinceDropdown = () => {
  setTimeout(() => {
    isProvinceDropdownOpen.value = false;
  }, 200);
};

// ================= Pagination (แบ่งหน้า) =================
const currentPage = ref(1);
const itemsPerPage = 10;
const providerListRef = ref<HTMLElement | null>(null);

watch(filteredProviders, () => {
  currentPage.value = 1;
});

const totalPages = computed(() => {
  return Math.ceil(filteredProviders.value.length / itemsPerPage) || 1;
});

const paginatedProviders = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage;
  const end = start + itemsPerPage;
  return filteredProviders.value.slice(start, end);
});

const scrollToTop = () => {
  if (providerListRef.value) {
    providerListRef.value.scrollIntoView({ behavior: 'smooth' });
  }
};

const nextPage = () => {
  if (currentPage.value < totalPages.value) {
    currentPage.value++;
    scrollToTop();
  }
};

const prevPage = () => {
  if (currentPage.value > 1) {
    currentPage.value--;
    scrollToTop();
  }
};

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
  <ion-page>
    <Navbar />

    <ion-content>
      <ion-refresher slot="fixed" @ionRefresh="handleRefresh($event)">
          <ion-refresher-content
            pulling-icon="lines"
            refreshing-spinner="crescent">
          </ion-refresher-content>
        </ion-refresher>

      <div class="page-container">
        
        <div class="search-header">
          <div class="search-bar">
            <ion-input 
              v-model="searchKeyword" 
              placeholder="ค้นหาชื่อ, สไตล์งาน..." 
              class="custom-search-input">
            </ion-input>
            
            <ion-button class="filter-toggle" @click="showFilter = !showFilter" style="--background: #3b2b2600; --border-radius: 12px; margin: 0; height: 48px;">
              Filter
            </ion-button>
          </div>

          <div v-if="showFilter" class="filter-dropdown">
            <h4>Type of Service</h4>
            <div class="checkbox-group">
              <label><input type="checkbox" value="makeup" v-model="selectedRoles"> Makeup Artist</label>
              <label><input type="checkbox" value="photographer" v-model="selectedRoles"> Photographer</label>
            </div>

            <h4>Price Range (THB)</h4>
            <div class="price-range">
              <input type="number" v-model="minPrice" placeholder="Minimum" /> 
              <span class="price-separator">-</span>
              <input type="number" v-model="maxPrice" placeholder="Maximum" />
            </div>

            <h4>Provinces</h4>
            <div class="province-search-container" ref="provinceContainerRef"> 
              <input 
                type="text" 
                v-model="provinceSearch" 
                placeholder="Type province name to search..." 
                @focus="isProvinceDropdownOpen = true" 
                @blur="closeProvinceDropdown"
              />
              <div v-if="isProvinceDropdownOpen && filteredProvincesList.length > 0" class="province-dropdown">
                <div v-for="prov in filteredProvincesList" :key="prov" class="dropdown-item" @click="selectProvince(prov)">
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
              <ion-button fill="outline" class="btn-clear" @click="clearFilter" style="--color: #C89F8A; --border-color: #C89F8A; margin: 0;">Clear</ion-button>
              <ion-button class="btn-apply" @click="applyFilter" style="--background: #C89F8A; margin: 0;">Apply it</ion-button>
            </div>
          </div>
        </div>

        <div class="provider-list" ref="providerListRef">
          <div v-if="isLoading" class="loading">
             <ion-spinner name="crescent" color="medium"></ion-spinner>
             <p style="margin-top: 10px;">Loading data...</p>
          </div>
          <div v-else-if="filteredProviders.length === 0" class="empty">No providers found matching the criteria</div>
          
          <div v-for="provider in paginatedProviders" :key="provider.id" class="provider-card" @click="router.push(`/provider/${provider.id}`)">
            <img :src="provider.provider_info?.portfolios?.[0] || 'https://via.placeholder.com/390x200'" class="cover-img" />
            
            <div class="card-body">
              <div class="specialty">{{ provider.provider_info?.specialty || 'General Services' }}</div>
              
              <div class="row-info">
                <span class="role-badge">{{ provider.provider_info?.service_type === 'makeup' ? 'Makeup Artist' : 'Photographer' }}</span>
                <span class="price">Starting at {{ provider.provider_info?.price_start || 0 }} ฿</span>
              </div>

              <div class="row-info bottom-row">
                <div class="user-info">
                  <img :src="provider.profile_image || 'https://via.placeholder.com/40'" class="avatar" />
                  <span class="name">{{ provider.full_name }}</span>
                </div>
                <div class="stats">
                  <span>
                    <img src="/images/sold.png" class="stat-icon" />
                    Sold {{ provider.provider_info?.sold_count || 0 }} times
                  </span>
                  <span>
                    <img src="/images/star.png" class="stat-icon" />
                    {{ provider.provider_info?.rating_avg || '0.0' }}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div v-if="totalPages > 1" class="pagination-wrapper">
            <button class="page-btn" @click="prevPage" :disabled="currentPage === 1">&lt;</button>
            <span class="page-info">{{ currentPage }} / {{ totalPages }}</span>
            <button class="page-btn" @click="nextPage" :disabled="currentPage === totalPages">&gt;</button>
          </div>

        </div>

      </div>
    </ion-content>
  </ion-page>
</template>

<style scoped>
.custom-search-input {
  --padding-start: 18px;
  --padding-end: 18px;
  --padding-top: 14px;
  --padding-bottom: 14px;
  --background: #faf8f5;
  --border-radius: 12px;
  border: 1px solid #e0d8d0;
  font-size: 15px;
  transition: 0.2s;
  height: 48px;
}
.custom-search-input.ion-focused {
  border-color: #C89F8A;
  box-shadow: 0 0 0 3px rgba(200, 159, 138, 0.15);
}

.pagination-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 20px;
  margin-top: 10px;
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

/* =========================
   แก้ไข: Layout การ์ด
   Desktop = 4 columns
   Mobile = 2 columns
========================= */

.provider-list {
  display: grid;
  grid-template-columns: repeat(4, 1fr); /* แก้เป็น 4 คอลัมน์ */
  gap: 16px;
}

.stat-icon{
  width:16px;
  height:16px;
  object-fit:contain;
  vertical-align:middle;
  margin-right:4px;
}

/* Tablet */
@media (max-width: 1024px) {
  .provider-list {
    grid-template-columns: repeat(3, 1fr);
  }
}

/* Mobile */
@media (max-width: 768px) {
  .provider-list {
    grid-template-columns: repeat(2, 1fr); /* มือถือ 2 คอลัมน์ */
  }
}

.provider-card {
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border-radius: 14px;
  background: #fff;
  box-shadow: 0 8px 18px rgba(0, 0, 0, 0.08);
  cursor: pointer;
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}

.provider-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 10px 20px rgba(0, 0, 0, 0.14);
}

/* =========================
   แก้ไข: รูปการ์ดเป็น 3:4
========================= */

.cover-img {
  width: 100%;
  aspect-ratio: 3 / 4;
  object-fit: cover;
  display: block;
}
</style>