<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';

const router = useRouter();

// ================= State (Mockup) =================
// ตัวแปรจำลองสถานะ ว่าตอนนี้เรากำลังเทสต์แอคเคาท์ลูกค้า หรือ ช่าง
const myRole = ref<'customer' | 'provider'>('provider'); 

const newMessage = ref('');
const showQuoteModal = ref(false);

// ฟิลด์สร้างใบเสนอราคา
const quotePrice = ref('');
const quoteWorkDate = ref('');

// ข้อมูลแชท (Mockup)
const messages = ref<any[]>([
  { id: 1, sender: 'customer', type: 'text', text: 'สวัสดีครับ วันที่ 30 รับงานแถวสยามไหมครับ?' },
  { id: 2, sender: 'provider', type: 'text', text: 'รับครับผม เดี๋ยวผมส่งใบเสนอราคาให้นะครับ' }
]);

// ================= Functions =================
const sendMessage = () => {
  if (!newMessage.value.trim()) return;
  messages.value.push({
    id: Date.now(),
    sender: myRole.value, // ส่งจาก Role ปัจจุบันของเรา
    type: 'text',
    text: newMessage.value
  });
  newMessage.value = '';
};

const sendQuotation = () => {
  if (!quotePrice.value || !quoteWorkDate.value) {
    alert('กรุณากรอกราคาและวันที่ให้ครบถ้วน');
    return;
  }
  
  // จำลองการสร้าง Date Reserved
  const today = new Date();
  const dateReserved = `${today.getDate()}/${today.getMonth() + 1}/${today.getFullYear() + 543}`;

  messages.value.push({
    id: Date.now(),
    sender: 'provider',
    type: 'quotation',
    data: {
      providerName: 'BroccoliP (auto gen)',
      customerName: 'Rika (auto gen)',
      price: quotePrice.value,
      dateReserved: dateReserved,
      dateToWork: quoteWorkDate.value,
    }
  });
  
  showQuoteModal.value = false;
  quotePrice.value = '';
  quoteWorkDate.value = '';
};
</script>

<template>
  <div class="chat-container">
    <div class="chat-header">
      <button class="back-btn" @click="router.push('/chats')">←</button>
      <img src="https://via.placeholder.com/40" class="avatar" />
      <span class="name">พี่นัท ช่างภาพอิสระ</span>
      
      <button class="test-role-btn" @click="myRole = myRole === 'provider' ? 'customer' : 'provider'">
        Test as: {{ myRole }}
      </button>
    </div>

    <div class="chat-messages">
      <div 
        v-for="msg in messages" 
        :key="msg.id" 
        class="message-wrapper"
        :class="msg.sender === myRole ? 'sent' : 'received'"
      >
        <div v-if="msg.type === 'text'" class="bubble text-bubble">
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

          <button v-if="myRole === 'customer'" class="btn-slip">📷 แนบสลิปชำระเงิน</button>
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
.chat-container { display: flex; flex-direction: column; height: 100vh; background: #e5ddd5; }

.chat-header { display: flex; align-items: center; padding: 15px; background: white; border-bottom: 1px solid #ddd; position: sticky; top: 0; z-index: 10; }
.back-btn { background: none; border: none; font-size: 24px; cursor: pointer; margin-right: 15px; color: #333; }
.avatar { width: 40px; height: 40px; border-radius: 50%; object-fit: cover; margin-right: 10px; }
.name { font-weight: bold; font-size: 16px; flex: 1; text-align: left;}
.test-role-btn { font-size: 10px; background: #ff9800; color: white; border: none; padding: 5px; border-radius: 4px; cursor: pointer; }

.chat-messages { flex: 1; padding: 20px; overflow-y: auto; display: flex; flex-direction: column; gap: 15px; }
.message-wrapper { display: flex; flex-direction: column; }
.message-wrapper.sent { align-items: flex-end; }
.message-wrapper.received { align-items: flex-start; }

.bubble { max-width: 80%; padding: 12px 16px; border-radius: 12px; font-size: 15px; text-align: left; line-height: 1.4; box-shadow: 0 1px 2px rgba(0,0,0,0.1); }
.text-bubble { background: white; }
.sent .text-bubble { background: #dcf8c6; }

/* Quotation Style */
.quote-bubble { background: white; border: 2px solid #4CAF50; width: 100%; max-width: 300px; padding: 15px; }
.quote-header { font-weight: bold; font-size: 16px; color: #4CAF50; border-bottom: 1px solid #eee; padding-bottom: 8px; margin-bottom: 10px; text-align: center; }
.quote-bubble p { margin: 5px 0; font-size: 14px; }
.highlight { font-weight: bold; color: #e53935; }
.qr-box { display: flex; flex-direction: column; align-items: center; margin-top: 15px; background: #f9f9f9; padding: 10px; border-radius: 8px; }
.qr-mockup { width: 120px; height: 120px; }
.qr-text { font-size: 12px; color: #888; margin-top: 5px; }
.btn-slip { width: 100%; padding: 10px; background: #2196F3; color: white; border: none; border-radius: 8px; font-weight: bold; margin-top: 15px; cursor: pointer; }

/* Footer */
.chat-footer { display: flex; align-items: center; padding: 10px 15px; background: #f0f0f0; gap: 10px; }
.btn-quote { background: white; border: 1px solid #ccc; border-radius: 20px; padding: 10px 15px; font-weight: bold; cursor: pointer; font-size: 14px;}
.chat-footer input { flex: 1; padding: 12px 15px; border-radius: 25px; border: none; outline: none; font-size: 15px;}
.btn-send { background: #4CAF50; color: white; border: none; border-radius: 50%; width: 45px; height: 45px; font-weight: bold; cursor: pointer; display: flex; align-items: center; justify-content: center;}

/* Modal */
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