<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { auth, db } from '../config/firebase';
import { collection, doc, setDoc, addDoc, onSnapshot, query, orderBy, serverTimestamp, getDoc, updateDoc, increment } from 'firebase/firestore';
import { IonPage, IonContent, IonFooter, IonInput, IonButton, IonSpinner } from '@ionic/vue';

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
const isCompletingJob = ref(false);
const contentRef = ref<any>(null);
let unsubscribeMessages: any = null;
let unsubscribeMeta: any = null;

const lastMyMessageId = computed(() => {
  const myMsgs = messages.value.filter(m => m.senderId === myUid);
  return myMsgs.length > 0 ? myMsgs[myMsgs.length - 1].id : null;
});

const activePaidQuotation = computed(() => {
  return messages.value.find(m => m.type === 'quotation' && m.data?.status === 'paid');
});

// ================= Functions =================
onMounted(async () => {
  if (!currentUser) {
    alert('Please log in');
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

  unsubscribeMeta = onSnapshot(doc(db, 'chats', roomId), (docSnap) => {
    if (docSnap.exists()) {
      const data = docSnap.data();
      chatMeta.value = data;
      if (data.unreadBy === myUid) {
        updateDoc(doc(db, 'chats', roomId), { unreadBy: '' });
      }
    }
  });

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
    alert('Please fill in the price and date completely');
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
    status: 'pending' // pending -> paid -> completed
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

    /*
    const providerRef = doc(db, 'users', msg.senderId);
    await updateDoc(providerRef, {
      'provider_info.sold_count': increment(1)
    });
    */

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

const markJobAsCompleted = async () => {
  const quotationMsg = activePaidQuotation.value;
  if (!quotationMsg) return;
  if (!confirm('Are you sure the job is done? The payment will be transferred to the provider.')) return;
  isCompletingJob.value = true;
  try {
    await updateDoc(doc(db, 'chats', roomId, 'messages', quotationMsg.id), {
      'data.status': 'completed'
    });
    await updateDoc(doc(db, 'users', quotationMsg.senderId), {
      'provider_info.sold_count': increment(1)
    });
    await addDoc(collection(db, 'chats', roomId, 'messages'), {
      senderId: 'system',
      type: 'system',
      text: 'The job is completed and the payment has been transferred to the provider successfully.',
      createdAt: serverTimestamp()
    });
    await setDoc(doc(db, 'chats', roomId), {
      participants: [myUid, otherUserId],
      lastMessage: 'Job Completed',
      updatedAt: serverTimestamp(),
      unreadBy: otherUserId
    }, { merge: true });
  } catch (error) {
    console.error('Error completing job:', error);
    alert('Failed to complete the job.');
  } finally {
    isCompletingJob.value = false;
  }
};

const goBack = () => {
  (document.activeElement as HTMLElement)?.blur();
  router.push('/chats');
};
</script>

<template>
  <ion-page>
    <div class="chat-header">
      <button class="back-btn" @click="goBack">
        <img src="/images/back.png" alt="back" class="back-icon">
      </button>
      <img :src="otherUser?.profile_image && otherUser.profile_image.includes('http') ? otherUser.profile_image : 'https://ui-avatars.com/api/?name=U&background=EAEAEA&color=333'" class="avatar" />
      <span class="name">{{ otherUser?.full_name || 'Loading...' }}</span>
    </div>

    <ion-content ref="contentRef" class="custom-chat-content">
      <div class="chat-messages">
        <div 
          v-for="msg in messages" 
          :key="msg.id" 
          class="message-wrapper"
          :class="{
            'sent': msg.senderId === myUid && msg.type === 'text', 
            'received': msg.senderId !== myUid && msg.type === 'text',
            'action-card': msg.type === 'quotation' || msg.type === 'image',
            'system': msg.type === 'system'
          }"
        >
          <div v-if="msg.type === 'text'" class="bubble text-bubble">
            {{ msg.text }}
          </div>

          <div v-if="msg.type === 'image'" class="action-bubble image-bubble">
            <div class="action-label">🧾 Proof of Payment</div>
            <img :src="msg.imageUrl" class="chat-image" />
          </div>

          <div v-if="msg.type === 'system'" class="system-message">
            {{ msg.text }}
          </div>

          <div v-if="msg.type === 'quotation'" class="action-bubble quote-bubble">
            <div class="quote-header">Quotation</div>
            <p><strong>Service Provider:</strong> {{ msg.data.providerName }}</p>
            <p><strong>Customer:</strong> {{ msg.data.customerName }}</p>
            <p><strong>Price:</strong> <span class="highlight">{{ msg.data.price }} ฿</span></p>
            <p><strong>Booking Date:</strong> {{ msg.data.dateReserved }}</p>
            <p><strong>Working Date:</strong> {{ msg.data.dateToWork }}</p>
            
            <div v-if="msg.data.status === 'pending'" class="qr-box">
              <img src="https://upload.wikimedia.org/wikipedia/commons/d/d0/QR_code_for_mobile_English_Wikipedia.svg" class="qr-mockup" alt="QR Code" />
              <span class="qr-text">Scan to pay</span>
            </div>

            <template v-if="msg.senderId !== myUid">
              <label v-if="msg.data.status === 'pending'" class="btn-slip" :class="{ disabled: isUploadingSlip }">
                <ion-spinner v-if="isUploadingSlip" name="dots"></ion-spinner>
                <span v-else>📷 Attach Payment Slip</span>
                <input type="file" accept="image/*" class="hidden" @change="(e) => handleSlipUpload(e, msg)" :disabled="isUploadingSlip" />
              </label>
              <div v-else-if="msg.data.status === 'paid'" class="paid-status-box">
                Paid. Waiting for job completion.
              </div>
              <div v-else-if="msg.data.status === 'completed'" class="paid-status-box success">
                Job completed successfully!
              </div>
            </template>

            <template v-else>
              <div v-if="msg.data.status === 'paid'" class="paid-status-box">
                Customer has paid. Waiting for you to complete the job.
              </div>
              <div v-else-if="msg.data.status === 'completed'" class="paid-status-box success">
                Job completed! Payment received.
              </div>
            </template>
          </div>

          <div v-if="msg.id === lastMyMessageId && msg.type !== 'system'" class="read-receipt">
            {{ chatMeta?.unreadBy === otherUserId ? 'Sent' : 'Read' }}
          </div>

        </div>
      </div>
    </ion-content>

    <ion-footer class="ion-no-border">
      
      <div v-if="myRole === 'customer' && activePaidQuotation" class="job-complete-banner">
        <ion-button expand="block" @click="markJobAsCompleted" :disabled="isCompletingJob" style="--background: #6b5a50; --border-radius: 12px; font-weight: bold;">
          <ion-spinner v-if="isCompletingJob" name="crescent"></ion-spinner>
          <span v-else>Mark Job as Completed</span>
        </ion-button>
      </div>

      <div class="chat-footer">
        <ion-button v-if="myRole === 'provider'" fill="clear" class="btn-quote" @click="showQuoteModal = true" style="--color: #3b2b26;">
          <img src="/images/quote.png" class="quote-icon" />
        </ion-button>
        <ion-input v-model="newMessage" placeholder="Type a message..." class="custom-chat-input" @keyup.enter="sendMessage"></ion-input>
        <ion-button shape="round" class="btn-send" @click="sendMessage" style="--background: #C89F8A;">
          <img slot="icon-only" src="/images/send.png" class="send-icon" />
        </ion-button>
      </div>
    </ion-footer>

    <div v-if="showQuoteModal" class="modal-overlay" @click.self="showQuoteModal = false">
      <div class="modal-box">
        <h3>Create a Quotation</h3>
        <div class="input-group">
          <label>Price (THB):</label>
          <ion-input type="number" v-model="quotePrice" placeholder="Enter price" class="custom-ion-input"></ion-input>
        </div>
        <div class="input-group">
          <label>Working Date:</label>
          <ion-input type="date" v-model="quoteWorkDate" class="custom-ion-input"></ion-input>
        </div>
        <div class="modal-actions">
          <ion-button fill="outline" class="btn-cancel-modal" @click="showQuoteModal = false" style="--color: #555; --border-color: #ccc; flex: 1;">Cancel</ion-button>
          <ion-button class="btn-submit-modal" @click="sendQuotation" style="--background: #C89F8A; flex: 1;">Send</ion-button>
        </div>
      </div>
    </div>
  </ion-page>
</template>
<style scoped>

/* ================= HEADER ================= */
.chat-header {
  display: flex;
  align-items: center;
  padding: 16px 24px;
  background: white;
  border-bottom: 1px solid rgba(0,0,0,0.05);
  z-index: 10;
}

.back-btn{
  background:none;
  border:none;
  cursor:pointer;
  padding:6px;
  display:flex;
  align-items:center;
  justify-content:center;
  margin-right:12px;
}

.back-icon{
  width:28px;
  height:28px;
  object-fit:contain;
}

.send-icon{
  width:28px;
  height:28px;
  object-fit:contain;
}

.avatar {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  object-fit: cover;
  margin-right: 12px;
}

.name {
  font-weight: 600;
  font-size: 16px;
  flex: 1;
  text-align: left;
  color: #3b2b26;
}


/* ================= CONTENT ================= */

.custom-chat-content {
  --background: #FAFAFA;
  padding-left: 12px;
  padding-right: 12px;
}

.chat-messages {
  padding: 24px 12px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}


/* ================= MESSAGE LAYOUT ================= */

.message-wrapper {
  display: flex;
  flex-direction: column;
}

.message-wrapper.sent {
  align-items: flex-end;
}

.message-wrapper.received {
  align-items: flex-start;
}

.message-wrapper.system {
  align-items: center;
  margin: 12px 0;
}

.message-wrapper.action-card {
  align-items: center;
  margin: 24px 0;
}


/* ================= TEXT BUBBLE ================= */

.bubble {
  max-width: 75%;
  padding: 14px 18px;
  border-radius: 18px;
  font-size: 15px;
  text-align: left;
  line-height: 1.5;
  box-shadow: 0 2px 6px rgba(0,0,0,0.03);
  word-break: break-word;
}

.text-bubble {
  background: white;
  color: #3b2b26;
  border-bottom-left-radius: 4px;
  border: 1px solid rgba(0,0,0,0.03);
}

.sent .text-bubble {
  background: #C89F8A;
  color: white;
  border-bottom-left-radius: 18px;
  border-bottom-right-radius: 4px;
  border: none;
}


/* ================= ACTION BUBBLE ================= */

.action-bubble {
  background: white;
  border-radius: 20px;
  box-shadow: 0 8px 30px rgba(0,0,0,0.08);
  border: 1px solid rgba(0,0,0,0.04);
  width: 100%;
}

.image-bubble {
  max-width: 280px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.action-label {
  font-size: 13px;
  font-weight: 700;
  color: #8B7355;
  margin-bottom: 12px;
  text-align: center;
  background: #faf8f5;
  padding: 6px 16px;
  border-radius: 20px;
}

.chat-image {
  max-width: 100%;
  border-radius: 12px;
  object-fit: cover;
  display: block;
}


/* ================= QUOTE ================= */

.quote-bubble {
  max-width: 320px;
  padding: 24px;
  border: 2px solid #C89F8A;
}

.quote-header {
  font-weight: 700;
  font-size: 16px;
  color: #C89F8A;
  border-bottom: 1px solid #f0e6e1;
  padding-bottom: 12px;
  margin-bottom: 14px;
  text-align: center;
}

.quote-bubble p {
  margin: 6px 0;
  font-size: 14px;
  color: #3b2b26;
}

.highlight {
  font-weight: 700;
  color: #8B7355;
  font-size: 16px;
}


/* ===== เพิ่ม style รูปใน quotation ===== */

.quote-image-box{
  display:flex;
  justify-content:center;
  margin-bottom:16px;
}

.quote-image{
  width:120px;
  height:120px;
  object-fit:contain;
}


/* ================= QR ================= */

.qr-box {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-top: 20px;
  background: #faf8f5;
  padding: 16px;
  border-radius: 16px;
  border: 1px dashed #e0d8d0;
}

.qr-mockup {
  width: 130px;
  height: 130px;
  border-radius: 12px;
}

.qr-text {
  font-size: 12px;
  color: #8B7355;
  margin-top: 10px;
  font-weight: 500;
}


/* ================= SLIP BUTTON ================= */

.btn-slip {
  display: block;
  width: 100%;
  text-align: center;
  padding: 14px;
  background: #3b2b26;
  color: white;
  border: none;
  border-radius: 12px;
  font-weight: 600;
  margin-top: 20px;
  cursor: pointer;
  box-sizing: border-box;
  transition: 0.2s;
  font-family: inherit;
}

.btn-slip:hover {
  background: #2a1e1b;
}

.btn-slip.disabled {
  background: #a8a09d;
  cursor: not-allowed;
}

.paid-status-box {
  margin-top: 20px;
  padding: 12px;
  background: #e9f5ec;
  color: #2e7d32;
  border-radius: 12px;
  text-align: center;
  font-weight: 600;
  font-size: 14px;
  border: 1px solid #c8e6c9;
}


/* ================= SYSTEM ================= */

.system-message {
  background: #f0ebe6;
  color: #6b5a50;
  font-size: 12px;
  font-weight: 600;
  padding: 8px 16px;
  border-radius: 20px;
  text-align: center;
}

.job-complete-banner {
  background:none;
  background: #fdfaf7;
  }

/* ================= READ RECEIPT ================= */

.read-receipt {
  font-size: 11px;
  color: #a39c97;
  margin-top: 6px;
  margin-right: 6px;
  font-weight: 500;
}

.action-card .read-receipt {
  margin-right: 0;
  margin-top: 10px;
  text-align: center;
}


/* ================= FOOTER ================= */

.chat-footer {
  display: flex;
  align-items: center;
  padding: 14px 20px;
  background: white;
  gap: 12px;
  border-top: 1px solid rgba(0,0,0,0.05);
  padding-bottom: max(16px, env(safe-area-inset-bottom));
}


/* ================= CHAT INPUT ================= */
.custom-chat-input {
  flex: 1;

  --padding-start: 16px;
  --padding-end: 16px;

  --background: faf8f5;
  --border-radius: 25px;
  border: 1px solid #F8F0E8;
  font-size: 15px;
  height: 48px;
}

/* ปิด native border ของ Ionic */
.custom-chat-input::part(native) {
  border: none !important;
  outline: none !important;
  box-shadow: none !important;
  background: transparent !important;
}

/* ปิด effect ตอน focus (แก้ปัญหากล่องซ้อน) */
.custom-chat-input.ion-focused,
.custom-chat-input.has-focus {
  --border-width: 0 !important;
  --box-shadow: none !important;
  outline: none !important;
}


/* ================= MODAL INPUT ================= */

.custom-ion-input {
  --padding-start: 10px;
  --padding-end: 10px;
  --background: white;
  border-radius: 8px;
  border: none;
  outline: none;
  box-shadow: none;
  margin-bottom: 10px;
}

</style>