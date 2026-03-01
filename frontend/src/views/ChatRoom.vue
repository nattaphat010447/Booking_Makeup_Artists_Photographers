<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { auth, db } from '../config/firebase';
import { collection, doc, setDoc, addDoc, onSnapshot, query, orderBy, serverTimestamp, getDoc, updateDoc, increment } from 'firebase/firestore';
import { IonPage, IonContent, IonFooter, IonToolbar, IonInput, IonButton, IonSpinner } from '@ionic/vue';

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
const contentRef = ref<any>(null);
let unsubscribeMessages: any = null;
let unsubscribeMeta: any = null;

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

  // ดึงข้อมูล Meta
  unsubscribeMeta = onSnapshot(doc(db, 'chats', roomId), (docSnap) => {
    if (docSnap.exists()) {
      const data = docSnap.data();
      chatMeta.value = data;
      if (data.unreadBy === myUid) {
        updateDoc(doc(db, 'chats', roomId), { unreadBy: '' });
      }
    }
  });

  // ดึงข้อความแชท
  const q = query(collection(db, 'chats', roomId, 'messages'), orderBy('createdAt', 'asc'));
  unsubscribeMessages = onSnapshot(q, (snapshot) => {
    messages.value = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    nextTick(() => {
      contentRef.value?.$el?.scrollToBottom(300);
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
  <ion-page>
    <div class="chat-header">
      <button class="back-btn" @click="router.push('/chats')">←</button>
      <img :src="otherUser?.profile_image || 'https://via.placeholder.com/40'" class="avatar" />
      <span class="name">{{ otherUser?.full_name || 'กำลังโหลด...' }}</span>
    </div>

    <ion-content ref="contentRef" class="custom-chat-content">
      <div class="chat-messages">
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
                <ion-spinner v-if="isUploadingSlip" name="dots"></ion-spinner>
                <span v-else>📷 แนบสลิปชำระเงิน</span>
                <input type="file" accept="image/*" class="hidden" @change="(e) => handleSlipUpload(e, msg)" :disabled="isUploadingSlip" />
              </label>
              <div v-else class="paid-status-box">✅ ชำระเงินเรียบร้อยแล้ว</div>
            </template>
            <template v-else>
              <div v-if="msg.data.status === 'paid'" class="paid-status-box">✅ ลูกค้าชำระเงินเรียบร้อยแล้ว</div>
            </template>
          </div>

          <div v-if="msg.id === lastMyMessageId && msg.type !== 'system'" class="read-receipt">
            {{ chatMeta?.unreadBy === otherUserId ? 'ส่งแล้ว' : 'อ่านแล้ว' }}
          </div>

        </div>
      </div>
    </ion-content>

    <ion-footer class="ion-no-border">
      <div class="chat-footer">
        <ion-button v-if="myRole === 'provider'" fill="clear" class="btn-quote" @click="showQuoteModal = true" style="--color: #3b2b26;">
          📋 เสนอราคา
        </ion-button>
        <ion-input v-model="newMessage" placeholder="พิมพ์ข้อความ..." class="custom-chat-input" @keyup.enter="sendMessage"></ion-input>
        <ion-button shape="round" class="btn-send" @click="sendMessage" style="--background: #C89F8A;">
          ส่ง
        </ion-button>
      </div>
    </ion-footer>

    <div v-if="showQuoteModal" class="modal-overlay" @click.self="showQuoteModal = false">
      <div class="modal-box">
        <h3>สร้างใบเสนอราคา</h3>
        <div class="input-group">
          <label>ราคา (บาท):</label>
          <ion-input type="number" v-model="quotePrice" placeholder="1000" class="custom-ion-input"></ion-input>
        </div>
        <div class="input-group">
          <label>วันที่ไปทำงาน:</label>
          <ion-input type="date" v-model="quoteWorkDate" class="custom-ion-input"></ion-input>
        </div>
        <div class="modal-actions">
          <ion-button fill="outline" class="btn-cancel-modal" @click="showQuoteModal = false" style="--color: #555; --border-color: #ccc; flex: 1;">ยกเลิก</ion-button>
          <ion-button class="btn-submit-modal" @click="sendQuotation" style="--background: #C89F8A; flex: 1;">ส่ง</ion-button>
        </div>
      </div>
    </div>
  </ion-page>
</template>

<style scoped>
.chat-header { 
  display: flex; align-items: center; padding: 16px 20px; 
  background: white; border-bottom: 1px solid rgba(0,0,0,0.05); 
  z-index: 10;
}
.back-btn { background: none; border: none; font-size: 24px; cursor: pointer; margin-right: 16px; color: #3b2b26; padding: 0; display: flex; align-items: center;}
.avatar { width: 44px; height: 44px; border-radius: 50%; object-fit: cover; margin-right: 12px; }
.name { font-weight: 600; font-size: 16px; flex: 1; text-align: left; color: #3b2b26;}

.custom-chat-content {
  --background: #FAFAFA;
}
.chat-messages { padding: 24px 20px; display: flex; flex-direction: column; gap: 16px;}

.chat-footer { 
  display: flex; align-items: center; padding: 12px 16px; 
  background: white; gap: 10px; border-top: 1px solid rgba(0,0,0,0.05); 
  padding-bottom: max(12px, env(safe-area-inset-bottom));
}

.custom-chat-input {
  flex: 1;
  --padding-start: 16px;
  --padding-end: 16px;
  --background: #faf8f5;
  --border-radius: 25px;
  border: 1px solid #e0d8d0;
  font-size: 15px;
  height: 48px;
}

.custom-ion-input {
  --padding-start: 10px;
  --padding-end: 10px;
  --background: #faf8f5;
  border-radius: 8px;
  border: 1px solid #ddd;
  margin-bottom: 10px;
}
</style>