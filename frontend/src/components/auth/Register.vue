<script setup lang="ts">
import { ref } from 'vue';
import { auth, db } from '../../config/firebase';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';

const email = ref('');
const password = ref('');
const fullName = ref('');
const phone = ref('');
const role = ref('customer');
const serviceType = ref('makeup'); // สำหรับช่าง

const isLoading = ref(false);

const handleRegister = async () => {
  isLoading.value = true;
  try {
    // 1. สมัครสมาชิกผ่าน Firebase Auth
    const userCred = await createUserWithEmailAndPassword(auth, email.value, password.value);
    const user = userCred.user;

    // 2. เตรียมข้อมูลบันทึกลง Firestore
    const userData: any = {
      email: user.email,
      full_name: fullName.value,
      phone: phone.value,
      role: role.value,
      created_at: new Date()
    };

    // 3. ถ้าเป็นช่าง ให้เพิ่ม provider_info เข้าไปเลย
    if (role.value === 'provider') {
      userData.provider_info = {
        service_type: serviceType.value,
        bio: '',
        price_start: 0,
        rating_avg: 0
      };
    }

    // 4. บันทึกลง Collection 'users'
    await setDoc(doc(db, 'users', user.uid), userData);

    alert('สมัครสมาชิกสำเร็จ!');
  } catch (error: any) {
    alert('เกิดข้อผิดพลาด: ' + error.message);
  } finally {
    isLoading.value = false;
  }
};
</script>

<template>
  <div class="auth-box">
    <h2>สมัครสมาชิก</h2>
    <form @submit.prevent="handleRegister">
      <div>
        <label>ชื่อ-นามสกุล:</label>
        <input v-model="fullName" type="text" required />
      </div>
      <div>
        <label>อีเมล:</label>
        <input v-model="email" type="email" required />
      </div>
      <div>
        <label>เบอร์โทร:</label>
        <input v-model="phone" type="text" />
      </div>
      <div>
        <label>รหัสผ่าน:</label>
        <input v-model="password" type="password" required />
      </div>
      
      <div>
        <label>สมัครในฐานะ:</label>
        <select v-model="role">
          <option value="customer">ลูกค้าทั่วไป</option>
          <option value="provider">ผู้ให้บริการ (ช่าง)</option>
        </select>
      </div>

      <div v-if="role === 'provider'">
        <label>ประเภทบริการ:</label>
        <select v-model="serviceType">
          <option value="makeup">ช่างแต่งหน้า</option>
          <option value="photographer">ช่างภาพ</option>
        </select>
      </div>

      <button type="submit" :disabled="isLoading">
        {{ isLoading ? 'กำลังสมัคร...' : 'สมัครสมาชิก' }}
      </button>
    </form>
  </div>
</template>

<style scoped>
.auth-box { border: 1px solid #ccc; padding: 20px; border-radius: 8px; max-width: 400px; margin: auto; }
div { margin-bottom: 10px; text-align: left; }
input, select { width: 100%; padding: 8px; margin-top: 5px; }
button { width: 100%; padding: 10px; background-color: #4CAF50; color: white; border: none; cursor: pointer; }
</style>