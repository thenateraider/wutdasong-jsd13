# Guess The Song 🎧

เว็บเกมสุ่มทายชื่อเพลงสไตล์ Modern Dark Mode รองรับการเล่นทั้งแบบคนเดียว (Single Player) และผู้เล่นหลายคนแบบเรียลไทม์ (Multiplayer Sync) ด้วย Socket.io โดยดึงเพลงคุณภาพสูงจาก Spotify Web API / iTunes API มาใช้งาน

---

## 🚀 ฟีเจอร์หลัก (Features)

### 1. โหมด Single Player
* **Game Configurations:** ตั้งค่าจำนวนเพลง (5, 10, 20), เวลาในการตอบ (5s - 20s), ความยาวคลิปเพลงที่เปิด (3s - 10s), และระดับความยากง่าย (Easy, Normal, Hard)
* **Genre Selection:** เลือกหมวดหมู่เพลงได้หลากหลาย (Pop, Rock, Anime, Thai, K-pop, Game, Movie, Random)
* **Spotify Playlist Support:** สามารถวาง URL ของ Spotify Playlist (แบบสาธารณะ) เพื่อสุ่มเพลงจากเพลย์ลิสต์ส่วนตัวมาเล่นได้!
* **Points System:** คำนวณคะแนนตามความรวดเร็วในการตอบ (คะแนนฐาน 100 คะแนน + โบนัสเวลาที่เหลือ × 5)
* **Performance Rank:** สรุปผลความแม่นยำ (Accuracy) และจัดลำดับคะแนนเป็นเกรด S, A, B, C

### 2. โหมด Multiplayer (Real-time Sync)
* **Room Lobby:** สร้างห้อง (Create Room) ตั้งชื่อห้อง/ใส่รหัสผ่าน หรือค้นหารหัสห้องเพื่อเข้าร่วม (Join Room)
* **Ready System:** ระบบเตรียมความพร้อมผู้เล่นทุกคนก่อนเริ่มเกม
* **Mini Chat:** ห้องแชทขนาดเล็กใน Lobby สำหรับพูดคุยและแสดงสถานะผู้เล่นเข้า/ออกห้อง
* **Real-time Sync:** ตัวนับเวลา, การสุ่มเพลง, ลำดับการเล่น, และคะแนนของทุกคนจะซิงค์ตรงกันผ่าน Socket.io
* **Leaderboard Animation:** แสดงลำดับผู้เล่นที่ขยับขึ้น-ลงตามคะแนนหลังจบแต่ละรอบ
* **Winner Celebration:** แสดงความยินดีกับผู้ชนะพร้อม Confetti เอฟเฟกต์หลังจบเกม

### 3. ระบบเพลงและ Visualizer
* **Dynamic Audio Engine:** ดึงข้อมูลเพลงแบบเรียลไทม์ผ่าน Spotify API หากพบเพลงที่ไม่มีคลิปตัวอย่างจะ fallback ไปใช้ iTunes API โดยอัตโนมัติ (และมี Static Fallback เพลงไทย/สากลยอดฮิตป้องกันกรณีเน็ตเวิร์กขาดการติดต่อ)
* **Sound Visualizer:** แสดงแอนิเมชันคลื่นความถี่เสียง (Frequencies) ขณะเพลงเล่นโดยใช้ HTML5 Web Audio API
* **Anti-Cheat logic:** ไคลเอนต์จะไม่ได้รับคำตอบจริงจนกว่าเวลาของรอบจะสิ้นสุดลง (เฉลยถูกส่งมาจาก Backend ในตอนหมดเวลาเท่านั้น)

---

## 📁 โครงสร้างโปรเจกต์ (Folder Structure)

```text
Wutdasong/
├── client/                 # React 18 + Vite (Frontend)
│   ├── src/
│   │   ├── assets/         # ไฟล์รูปภาพ/มีเดีย
│   │   ├── components/     # Component สารพัดประโยชน์ (Visualizer, Wave Background)
│   │   ├── hooks/          # Custom Hooks (useAudio สำหรับ Web Audio API)
│   │   ├── pages/          # หน้าหลักแต่ละส่วน (Home, Setup, Lobby, Game, Result)
│   │   ├── store/          # Zustand State Management & Socket listeners
│   │   ├── App.tsx         # จุดเชื่อมต่อการจัดการ Screen State 
│   │   ├── main.tsx        # React DOM render entry
│   │   └── index.css       # สไตล์ชีทส่วนกลางร่วมกับ TailwindCSS
│   └── tailwind.config.js  # การตั้งค่าธีมสีและฟอนต์
│
└── server/                 # Node.js + Express + Socket.io (Backend)
    ├── src/
    │   ├── db/             # คลังข้อมูลเพลงสำรอง (Static Fallback Data)
    │   ├── game/           # GameEngine และ RoomManager logic
    │   ├── services/       # บริการภายนอก (Spotify & iTunes API search)
    │   └── index.ts        # จุดเริ่มต้นของ Express Server และ Socket handlers
```

---

## 🛠️ วิธีการติดตั้งและเริ่มใช้งาน (Getting Started)

### ความต้องการของระบบ (Prerequisites)
* [Node.js](https://nodejs.org/) (เวอร์ชัน 18 ขึ้นไป)

### 1. การตั้งค่าฝั่ง Server (Backend)
1. เข้าไปยังโฟลเดอร์ server:
   ```bash
   cd server
   ```
2. ติดตั้ง Dependencies:
   ```bash
   npm install
   ```
3. ตั้งค่าสภาพแวดล้อม (Environment Variables) โดยตรวจสอบไฟล์ `.env` ที่มีข้อมูลดังนี้:
   ```env
   PORT=5000
   # หากไม่มี Spotify API credentials ตัวเซิร์ฟเวอร์จะสุ่มเพลงผ่าน iTunes Search API แทนอัตโนมัติ
   SPOTIFY_CLIENT_ID="your_spotify_client_id"
   SPOTIFY_CLIENT_SECRET="your_spotify_client_secret"
   ```
4. รันเซิร์ฟเวอร์ในโหมดพัฒนา (Development):
   ```bash
   npm run dev
   ```

### 2. การตั้งค่าฝั่ง Client (React Frontend)
1. เปิด Terminal ใหม่แล้วเข้าไปยังโฟลเดอร์ client:
   ```bash
   cd client
   ```
2. ติดตั้ง Dependencies:
   ```bash
   npm install
   ```
3. รันไคลเอนต์ในโหมดพัฒนา (Development):
   ```bash
   npm run dev
   ```
4. เปิดบราวเซอร์ไปที่ [http://localhost:5173](http://localhost:5173) เพื่อเริ่มเล่นเกมได้ทันที!

---

## 🎨 ธีมและการออกแบบ (Design Aesthetics)
* **Dark Theme:** ใช้โทนสีเข้มหลักเป็น `#111827` (slate-900) ร่วมกับการ์ด `#1F2937`
* **Accent Color:** ใช้โทนสีม่วงสว่าง `#7C3AED` (Violet-600) สำหรับอินเตอร์เฟสและส่วนที่เป็นจุดเด่น
* **Micro-Animations:** แอนิเมชันเปลี่ยนหน้าแบบลื่นไหลและเอฟเฟกต์การ Hover/Click ปุ่มด้วย **Framer Motion** และ CSS Ripple Effect
