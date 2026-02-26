<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { auth, db } from '../config/firebase';
import { collection, doc, setDoc, addDoc, onSnapshot, query, orderBy, serverTimestamp, getDoc, updateDoc, increment } from 'firebase/firestore'; // <--- เพิ่ม updateDoc, increment

const route = useRoute();
const router = useRouter();

// ================= State =================
const otherUserId = route.params.id as string; 
const currentUser = auth.currentUser;
const myUid = currentUser?.uid || '';

const roomId = myUid < otherUserId ? `${myUid}_${otherUserId}` : `${otherUserId}_${myUid}`;

const messages = ref<any[]>([]);
const newMessage = ref('');
const otherUser = ref<any>(null);
const myRole = ref('customer');
const myName = ref('');

const showQuoteModal = ref(false);
const quotePrice = ref('');
const quoteWorkDate = ref('');

const isUploadingSlip = ref(false); 
const messagesContainer = ref<HTMLElement | null>(null);
let unsubscribe: any = null;

// ================= Functions =================
onMounted(async () => {
  if (!currentUser) {
    alert('กรุณาเข้าสู่ระบบ');
    router.push('/login');
    return;
  }

  const myDoc = await getDoc(doc(db, 'users', myUid));
  if (myDoc.exists()) {
    myRole.value = myDoc.data().role;
    myName.value = myDoc.data().full_name;
  }

  const otherDoc = await getDoc(doc(db, 'users', otherUserId));
  if (otherDoc.exists()) {
    otherUser.value = otherDoc.data();
  }

  const q = query(collection(db, 'chats', roomId, 'messages'), orderBy('createdAt', 'asc'));
  unsubscribe = onSnapshot(q, (snapshot) => {
    messages.value = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    nextTick(() => {
      if (messagesContainer.value) {
        messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight;
      }
    });
  });
});

onUnmounted(() => {
  if (unsubscribe) unsubscribe();
});

const sendMessage = async () => {
  if (!newMessage.value.trim()) return;
  const msgText = newMessage.value;
  newMessage.value = ''; 

  await setDoc(doc(db, 'chats', roomId), {
    participants: [myUid, otherUserId],
    lastMessage: msgText,
    updatedAt: serverTimestamp()
  }, { merge: true });

  await addDoc(collection(db, 'chats', roomId, 'messages'), {
    senderId: myUid,
    text: msgText,
    type: 'text',
    createdAt: serverTimestamp()
  });
};

const sendQuotation = async () => {
  if (!quotePrice.value || !quoteWorkDate.value) {
    alert('กรุณากรอกราคาและวันที่ให้ครบถ้วน');
    return;
  }
  
  const today = new Date();
  const dateReserved = `${today.getDate()}/${today.getMonth() + 1}/${today.getFullYear() + 543}`;

  const quoteData = {
    providerName: myName.value,
    customerName: otherUser.value?.full_name || 'ลูกค้า',
    price: quotePrice.value,
    dateReserved: dateReserved,
    dateToWork: quoteWorkDate.value,
    status: 'pending' // <--- เพิ่มสถานะใบเสนอราคา
  };

  await setDoc(doc(db, 'chats', roomId), {
    participants: [myUid, otherUserId],
    lastMessage: 'ส่งใบเสนอราคาแล้ว',
    updatedAt: serverTimestamp()
  }, { merge: true });

  await addDoc(collection(db, 'chats', roomId, 'messages'), {
    senderId: myUid,
    type: 'quotation',
    data: quoteData,
    createdAt: serverTimestamp()
  });
  
  showQuoteModal.value = false;
  quotePrice.value = '';
  quoteWorkDate.value = '';
};

// ----------------- ระบบอัปโหลดสลิป -----------------
const uploadToCloudinary = async (file: File): Promise<string> => {
  const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
  const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;
  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', uploadPreset);

  const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
    method: 'POST',
    body: formData,
  });
  const data = await res.json();
  return data.secure_url;
};

// รับ msg ตัวเต็มมาเพื่อใช้ ID ในการอัปเดตสถานะ
const handleSlipUpload = async (e: Event, msg: any) => {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (!file) return;

  isUploadingSlip.value = true;
  try {
    // 1. อัปโหลดรูปสลิปขึ้น Cloudinary
    const slipUrl = await uploadToCloudinary(file);

    // 2. ปิดการส่งสลิปซ้ำ: อัปเดตใบเสนอราคานี้ให้เป็นสถานะ 'paid'
    const msgRef = doc(db, 'chats', roomId, 'messages', msg.id);
    await updateDoc(msgRef, {
      'data.status': 'paid'
    });

    // 3. เพิ่มยอด Sold ให้กับช่าง +1 (โดยใช้ id ของคนส่งใบเสนอราคา)
    const providerRef = doc(db, 'users', msg.senderId);
    await updateDoc(providerRef, {
      'provider_info.sold_count': increment(1)
    });

    // 4. ส่งข้อความประเภท "รูปภาพ (สลิป)" ลงแชท
    await addDoc(collection(db, 'chats', roomId, 'messages'), {
      senderId: myUid,
      type: 'image',
      imageUrl: slipUrl,
      createdAt: serverTimestamp()
    });

    await setDoc(doc(db, 'chats', roomId), {
      participants: [myUid, otherUserId],
      lastMessage: 'ส่งหลักฐานการชำระเงินแล้ว',
      updatedAt: serverTimestamp()
    }, { merge: true });

    // 5. จำลองระบบตรวจสอบอัตโนมัติ
    setTimeout(async () => {
      await addDoc(collection(db, 'chats', roomId, 'messages'), {
        senderId: 'system', 
        type: 'system',
        text: '[ระบบ] : ระบบได้ตรวจสอบการชำระเงินเรียบร้อย',
        createdAt: serverTimestamp()
      });
      
      await setDoc(doc(db, 'chats', roomId), {
        participants: [myUid, otherUserId],
        lastMessage: '[ระบบ] : ตรวจสอบการชำระเงินเรียบร้อย',
        updatedAt: serverTimestamp()
      }, { merge: true });
    }, 1500);

  } catch (error) {
    console.error('Upload error:', error);
    alert('เกิดข้อผิดพลาดในการส่งสลิป');
  } finally {
    isUploadingSlip.value = false;
  }
};
</script>

<template>
  <div class="chat-container">
    <div class="chat-header">
      <button class="back-btn" @click="router.push('/chats')">←</button>
      <img :src="otherUser?.profile_image || 'https://via.placeholder.com/40'" class="avatar" />
      <span class="name">{{ otherUser?.full_name || 'กำลังโหลด...' }}</span>
    </div>

    <div class="chat-messages" ref="messagesContainer">
      <div 
        v-for="msg in messages" 
        :key="msg.id" 
        class="message-wrapper"
        :class="{
          'sent': msg.senderId === myUid && msg.type !== 'system', 
          'received': msg.senderId !== myUid && msg.type !== 'system',
          'system': msg.type === 'system'
        }"
      >
        <div v-if="msg.type === 'text'" class="bubble text-bubble">
          {{ msg.text }}
        </div>

        <div v-if="msg.type === 'image'" class="bubble image-bubble">
          <img :src="msg.imageUrl" class="chat-image" />
        </div>

        <div v-if="msg.type === 'system'" class="system-message">
          {{ msg.text }}
        </div>

        <div v-if="msg.type === 'quotation'" class="bubble quote-bubble">
          <div class="quote-header">📋 ใบเสนอราคา</div>
          <p><strong>Service Provider:</strong> {{ msg.data.providerName }}</p>
          <p><strong>Customer:</strong> {{ msg.data.customerName }}</p>
          <p><strong>Price:</strong> <span class="highlight">{{ msg.data.price }} Baht</span></p>
          <p><strong>Date reserved:</strong> {{ msg.data.dateReserved }}</p>
          <p><strong>Date to Work:</strong> {{ msg.data.dateToWork }}</p>
          
          <div class="qr-box">
            <img src="https://upload.wikimedia.org/wikipedia/commons/d/d0/QR_code_for_mobile_English_Wikipedia.svg" class="qr-mockup" alt="QR Code" />
            <span class="qr-text">สแกนเพื่อชำระเงิน</span>
          </div>

          <template v-if="msg.senderId !== myUid">
            <label v-if="msg.data.status !== 'paid'" class="btn-slip" :class="{ disabled: isUploadingSlip }">
              {{ isUploadingSlip ? 'กำลังส่งสลิป...' : '📷 แนบสลิปชำระเงิน' }}
              <input type="file" accept="image/*" class="hidden" @change="(e) => handleSlipUpload(e, msg)" :disabled="isUploadingSlip" />
            </label>
            <div v-else class="paid-status-box">
              ✅ ชำระเงินเรียบร้อยแล้ว
            </div>
          </template>
          <template v-else>
            <div v-if="msg.data.status === 'paid'" class="paid-status-box">
              ✅ ลูกค้าชำระเงินเรียบร้อยแล้ว
            </div>
          </template>

        </div>
      </div>
    </div>

    <div class="chat-footer">
      <button v-if="myRole === 'provider'" class="btn-quote" @click="showQuoteModal = true">📋 เสนอราคา</button>
      <input v-model="newMessage" type="text" placeholder="พิมพ์ข้อความ..." @keyup.enter="sendMessage" />
      <button class="btn-send" @click="sendMessage">ส่ง</button>
    </div>

    <div v-if="showQuoteModal" class="modal-overlay" @click.self="showQuoteModal = false">
      <div class="modal-box">
        <h3>สร้างใบเสนอราคา</h3>
        <div class="input-group">
          <label>ราคา (บาท):</label>
          <input type="number" v-model="quotePrice" placeholder="1000" />
        </div>
        <div class="input-group">
          <label>วันที่ไปทำงาน:</label>
          <input type="date" v-model="quoteWorkDate" />
        </div>
        <div class="modal-actions">
          <button class="btn-outline" @click="showQuoteModal = false">ยกเลิก</button>
          <button class="btn-solid" @click="sendQuotation">ส่งใบเสนอราคา</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* สไตล์เดิมทั้งหมด นำมาต่อตรงนี้ได้เลย ผมขอเพิ่ม CSS สำหรับกล่อง Paid Status นิดหน่อยครับ */
.chat-container { display: flex; flex-direction: column; height: 100vh; background: #e5ddd5; }
.chat-header { display: flex; align-items: center; padding: 15px; background: white; border-bottom: 1px solid #ddd; position: sticky; top: 0; z-index: 10; }
.back-btn { background: none; border: none; font-size: 24px; cursor: pointer; margin-right: 15px; color: #333; }
.avatar { width: 40px; height: 40px; border-radius: 50%; object-fit: cover; margin-right: 10px; }
.name { font-weight: bold; font-size: 16px; flex: 1; text-align: left;}

.chat-messages { flex: 1; padding: 20px; overflow-y: auto; display: flex; flex-direction: column; gap: 15px; scroll-behavior: smooth;}
.message-wrapper { display: flex; flex-direction: column; }
.message-wrapper.sent { align-items: flex-end; }
.message-wrapper.received { align-items: flex-start; }
.message-wrapper.system { align-items: center; margin: 10px 0;}

.bubble { max-width: 80%; padding: 12px 16px; border-radius: 12px; font-size: 15px; text-align: left; line-height: 1.4; box-shadow: 0 1px 2px rgba(0,0,0,0.1); }
.text-bubble { background: white; }
.sent .text-bubble { background: #dcf8c6; }

.image-bubble { padding: 5px; background: transparent; box-shadow: none; }
.chat-image { max-width: 220px; border-radius: 12px; object-fit: cover; border: 3px solid white; box-shadow: 0 1px 3px rgba(0,0,0,0.2);}
.system-message { background: rgba(0,0,0,0.1); color: #555; font-size: 13px; font-weight: bold; padding: 8px 15px; border-radius: 20px; text-align: center; }

.quote-bubble { background: white; border: 2px solid #4CAF50; width: 100%; max-width: 300px; padding: 15px; }
.quote-header { font-weight: bold; font-size: 16px; color: #4CAF50; border-bottom: 1px solid #eee; padding-bottom: 8px; margin-bottom: 10px; text-align: center; }
.quote-bubble p { margin: 5px 0; font-size: 14px; }
.highlight { font-weight: bold; color: #e53935; }
.qr-box { display: flex; flex-direction: column; align-items: center; margin-top: 15px; background: #f9f9f9; padding: 10px; border-radius: 8px; }
.qr-mockup { width: 120px; height: 120px; }
.qr-text { font-size: 12px; color: #888; margin-top: 5px; }

.btn-slip { display: block; width: 100%; text-align: center; padding: 10px; background: #2196F3; color: white; border: none; border-radius: 8px; font-weight: bold; margin-top: 15px; cursor: pointer; box-sizing: border-box; }
.btn-slip.disabled { background: #90caf9; cursor: not-allowed; }
.hidden { display: none; }

/* CSS ใหม่สำหรับข้อความเมื่อจ่ายเงินแล้ว */
.paid-status-box { margin-top: 15px; padding: 10px; background: #E8F5E9; color: #2E7D32; border-radius: 8px; text-align: center; font-weight: bold; font-size: 14px; border: 1px solid #C8E6C9;}

.chat-footer { display: flex; align-items: center; padding: 10px 15px; background: #f0f0f0; gap: 10px; }
.btn-quote { background: white; border: 1px solid #ccc; border-radius: 20px; padding: 10px 15px; font-weight: bold; cursor: pointer; font-size: 14px;}
.chat-footer input { flex: 1; padding: 12px 15px; border-radius: 25px; border: none; outline: none; font-size: 15px;}
.btn-send { background: #4CAF50; color: white; border: none; border-radius: 50%; width: 45px; height: 45px; font-weight: bold; cursor: pointer; display: flex; align-items: center; justify-content: center;}

.modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000; }
.modal-box { background: white; padding: 25px; border-radius: 12px; width: 85%; max-width: 320px; text-align: left; }
.modal-box h3 { margin-top: 0; margin-bottom: 20px; text-align: center;}
.input-group { margin-bottom: 15px; }
.input-group label { display: block; font-weight: bold; margin-bottom: 5px; font-size: 14px;}
.input-group input { width: 100%; padding: 10px; border: 1px solid #ccc; border-radius: 8px; box-sizing: border-box;}
.modal-actions { display: flex; gap: 10px; margin-top: 20px; }
.btn-solid { flex: 1; padding: 12px; background: #4CAF50; color: white; border: none; border-radius: 8px; font-weight: bold; cursor: pointer; }
.btn-outline { flex: 1; padding: 12px; background: transparent; border: 1px solid #333; color: #333; border-radius: 8px; font-weight: bold; cursor: pointer; }
</style>