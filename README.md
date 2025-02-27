# AI FOR Thai demo

โปรเจกต์นี้เป็น **เว็บแอปพลิเคชัน** ที่ให้ผู้ใช้เลือกโหมด **Tokenization** , **QA (Question Answering)** และ **En2Th** โดยใช้ **FastAPI** และ **Next.js (React)**

---

## 🚀 **ขั้นตอนการติดตั้ง**

### **1. โคลน Repository**

```sh
git clone https://github.com/anusornc/webchat.git
cd webchat
```

### **2. ตั้งค่าระบบ Backend (FastAPI)**

#### **2.1 ติดตั้ง Dependencies**

**หากมีไฟล์ `requirements.txt` ให้ใช้:**
```sh
pip install -r requirements.txt
```

**ถ้าไม่มี `requirements.txt` ให้ติดตั้งแบบ manual:**
```sh
pip install fastapi uvicorn python-dotenv aift
```

#### **2.2 สร้างไฟล์ `.env` และเพิ่ม API Key**
```sh
touch .env
echo "AIFORTHAI_API_KEY=your-secret-api-key" >> .env
```

#### **2.3 รันเซิร์ฟเวอร์ Backend**

```sh
uvicorn main:app --reload
```

---

### **3. ตั้งค่าระบบ Frontend (Next.js)**

#### **3.1 ติดตั้ง Dependencies**

```sh
npm install
```

#### **3.2 สร้างไฟล์ `.env.local`**
```sh
touch .env.local
echo "NEXT_PUBLIC_BACKEND_URL=http://localhost:8000" >> .env.local
```

#### **3.3 รันเซิร์ฟเวอร์ Frontend**

```sh
npm run dev
```

---

## 🎯 **วิธีใช้งาน**
1. เปิด `http://localhost:3000`
2. เลือกโหมด (**Tokenize** หรือ **QA**)
3. พิมพ์ข้อความแล้วกด **Send**
4. ดูผลลัพธ์ที่ได้รับจากระบบ Backend

---

## 🔥 **การแก้ไขปัญหา**
### **1. Backend ไม่ตอบสนอง?**
- ตรวจสอบว่า FastAPI กำลังทำงานอยู่: `uvicorn main:app --reload`
- ตรวจสอบไฟล์ `.env` และแน่ใจว่า API Key ถูกต้อง

### **2. ปัญหากับ Frontend?**
- รีสตาร์ท Next.js: `npm run dev`
- ตรวจสอบว่า `.env.local` ถูกตั้งค่าอย่างถูกต้อง

---

## 📜 **ลิขสิทธิ์**
โปรเจกต์นี้เป็นแบบโอเพ่นซอร์ส สามารถนำไปปรับปรุงและพัฒนาเพิ่มเติมได้