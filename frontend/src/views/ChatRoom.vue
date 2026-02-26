<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { auth, db } from '../config/firebase';
import { collection, doc, setDoc, addDoc, onSnapshot, query, orderBy, serverTimestamp, getDoc, updateDoc, increment } from 'firebase/firestore';

const route = useRoute();
const router = useRouter();

// ================= State =================
const otherUserId = route.params.id as string; 
const currentUser = auth.currentUser;
const myUid = currentUser?.uid || '';

const roomId = myUid < otherUserId ? `${myUid}_${otherUserId}` : `${otherUserId}_${myUid}`;

const messages = ref<any[]>([]);
const chatMeta = ref<any>(null);
const newMessage = ref('');
const otherUser = ref<any>(null);
const myRole = ref('customer');
const myName = ref('');

const showQuoteModal = ref(false);
const quotePrice = ref('');
const quoteWorkDate = ref('');

const isUploadingSlip = ref(false); 
const messagesContainer = ref<HTMLElement | null>(null);
let unsubscribeMessages: any = null;
let unsubscribeMeta: any = null;

// 💡 หา ID ของข้อความ "ล่าสุดที่เราส่งเอง" เพื่อเอาไปโชว์สถานะอ่านแล้ว
const lastMyMessageId = computed(() => {
  const myMsgs = messages.value.filter(m => m.senderId === myUid);
  return myMsgs.length > 0 ? myMsgs[myMsgs.length - 1].id : null;
});

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

  // 1. ดึงข้อมูล Meta ของห้องแชทเพื่อเช็คการอ่าน
  unsubscribeMeta = onSnapshot(doc(db, 'chats', roomId), (docSnap) => {
    if (docSnap.exists()) {
      const data = docSnap.data();
      chatMeta.value = data;
      if (data.unreadBy === myUid) {
        updateDoc(doc(db, 'chats', roomId), { unreadBy: '' });
      }
    }
  });

  // 2. ดึงข้อความแชท
  const q = query(collection(db, 'chats', roomId, 'messages'), orderBy('createdAt', 'asc'));
  unsubscribeMessages = onSnapshot(q, (snapshot) => {
    messages.value = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    nextTick(() => {
      if (messagesContainer.value) {
        messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight;
      }
    });
  });
});

onUnmounted(() => {
  if (unsubscribeMessages) unsubscribeMessages();
  if (unsubscribeMeta) unsubscribeMeta();
});

const sendMessage = async () => {
  if (!newMessage.value.trim()) return;
  const msgText = newMessage.value;
  newMessage.value = ''; 

  // 💡 อัปเดต unreadBy ให้เป็นอีกฝ่าย
  await setDoc(doc(db, 'chats', roomId), {
    participants: [myUid, otherUserId],
    lastMessage: msgText,
    updatedAt: serverTimestamp(),
    unreadBy: otherUserId 
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
    status: 'pending'
  };

  await setDoc(doc(db, 'chats', roomId), {
    participants: [myUid, otherUserId],
    lastMessage: 'ส่งใบเสนอราคาแล้ว',
    updatedAt: serverTimestamp(),
    unreadBy: otherUserId
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

const handleSlipUpload = async (e: Event, msg: any) => {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (!file) return;

  isUploadingSlip.value = true;
  try {
    const slipUrl = await uploadToCloudinary(file);

    const msgRef = doc(db, 'chats', roomId, 'messages', msg.id);
    await updateDoc(msgRef, {
      'data.status': 'paid'
    });

    const providerRef = doc(db, 'users', msg.senderId);
    await updateDoc(providerRef, {
      'provider_info.sold_count': increment(1)
    });

    await addDoc(collection(db, 'chats', roomId, 'messages'), {
      senderId: myUid,
      type: 'image',
      imageUrl: slipUrl,
      createdAt: serverTimestamp()
    });

    await setDoc(doc(db, 'chats', roomId), {
      participants: [myUid, otherUserId],
      lastMessage: 'ส่งหลักฐานการชำระเงินแล้ว',
      updatedAt: serverTimestamp(),
      unreadBy: otherUserId
    }, { merge: true });

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
        updatedAt: serverTimestamp(),
        unreadBy: otherUserId
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

        <div v-if="msg.id === lastMyMessageId && msg.type !== 'system'" class="read-receipt">
          {{ chatMeta?.unreadBy === otherUserId ? 'ส่งแล้ว' : 'อ่านแล้ว' }}
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

