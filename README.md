# Guess The Song 🎧 (Wutdasong)

เว็บเกมสุ่มทายชื่อเพลงสไตล์ Modern Dark Mode รองรับการเล่นทั้งแบบคนเดียว (Single Player) และผู้เล่นหลายคนแบบเรียลไทม์ (Multiplayer Sync) ด้วย Socket.io โดยดึงเพลงคุณภาพสูงจาก Spotify Web API / iTunes API มาใช้งาน พร้อมระบบ Anti-Cheat แบบสมบูรณ์

---

## 🏗️ สถาปัตยกรรมระบบและ Tech Stack (Architecture)

โปรเจกต์นี้แบ่งออกเป็น 2 ส่วนหลักคือ Frontend (Client) และ Backend (Server) โดยมีการเชื่อมต่อฐานข้อมูล MongoDB

*   **Frontend (Client):** 
    *   **React 18 (Vite):** โครงสร้าง UI หลัก ทำงานแบบ Single Page Application (SPA)
    *   **Zustand:** จัดการ Global State อย่างง่ายและมีประสิทธิภาพ โดยแยก Store เป็นส่วนๆ เช่น `gameStore.ts` ใช้จัดการข้อมูลที่ซิงค์กับ Socket.io
    *   **Vanilla CSS + CSS Variables:** ออกแบบ UI แบบ Custom Design (Modern Dark Theme) พร้อม Micro-Animations สไตล์เรียบหรู โดยหลีกเลี่ยงการใช้ Framework ที่หนักเกินไป
    *   **Web Audio API:** ใช้สำหรับระบบ Frequencies Visualizer ที่วาดคลื่นเสียงขยับตามจังหวะดนตรีแบบเรียลไทม์
*   **Backend (Server):** 
    *   **Node.js + Express:** API Server หลักสำหรับการจัดการ HTTP Requests (เช่น ดึงข้อมูล Playlist, สรุปผลคะแนน)
    *   **Socket.io:** พระเอกหลักในการทำ Real-time Multiplayer ทำหน้าที่บรอดคาสต์สถานะเกม นับเวลาถอยหลัง และซิงค์ตำแหน่งหน้าจอของผู้เล่นทุกคนให้อยู่ในสถานะเดียวกัน
    *   **Mongoose (MongoDB):** จัดเก็บข้อมูล Leaderboard (ผู้ที่ได้คะแนนสูงสุด), ตารางเพลง Preset Playlists, และการแจ้งปัญหา (Issue Reports)
*   **External APIs:**
    *   **Spotify Web API:** ดึงข้อมูลเพลงและคลิปเสียงตัวอย่าง (30 วินาที)
    *   **iTunes Search API:** ระบบ Fallback สำรองในกรณีที่ Spotify ไม่มีคลิปเสียง (Preview URL) ให้เล่น

---

## ⚙️ ระบบการทำงานหลักของโค้ดอย่างละเอียด (System Deep Dive)

### 1. ระบบ Game Engine & Anti-Cheat (Server-side Game Logic)
เพื่อป้องกันไม่ให้ผู้เล่นสามารถกดดู "คำตอบที่ถูกต้อง" ผ่านหน้าต่าง Network หรือ Inspect Element ได้ ระบบจึงถูกออกแบบมาให้ปลอดภัย (Anti-Cheat) ดังนี้:
*   **Single Player:** 
    *   Client ส่งคำขอเริ่มเกมไปที่ `/api/singleplayer/start` 
    *   Server ทำการสุ่มเพลง (ผ่าน `musicService`) และคัดแยก "คำตอบที่ถูกต้อง (Secret Answer)" เก็บไว้ใน Memory Cache (`singleplayerAnswers` Map) 
    *   Server ส่งชุดข้อมูลกลับไปที่ Client โดย**ลบคำตอบที่แท้จริงทิ้ง** ให้ไปแค่คำถาม, คลิปเสียง, และช้อยส์ 4 ข้อ
    *   เมื่อ Client ตอบคำถาม จะยิง `/api/singleplayer/answer` เพื่อให้ Server ตรวจสอบกับ Cache และคำนวณคะแนนส่งกลับไป
*   **Multiplayer (RoomManager & GameEngine):**
    *   `RoomManager` ทำหน้าที่ดูแลห้องทั้งหมด (การสร้างห้อง, จัดการรหัสผ่าน, เตะผู้เล่น, ควบคุม Host)
    *   เมื่อเกมเริ่ม แต่ละห้องจะถูกผูกกับ `GameEngine` Instance ของตัวเอง
    *   `GameEngine` จะควบคุม **State Machine** ของเกม (`lobby` -> `playing` -> `reveal` -> `result`)
    *   เมื่ออยู่ในสถานะ `playing` Server จะส่งแค่ช้อยส์และเพลงไปให้ Client
    *   เมื่อทุกคนตอบครบ (หรือหมดเวลา) Server จะเข้าสู่สถานะ `reveal` ทำการคำนวณคะแนนตามความเร็ว (Speed Bonus), คำนวณ Combo Streak และบรอดคาสต์ตัวเฉลยกลับไปให้ทุกคนพร้อมกัน

### 2. ระบบ Audio Service และ Fallback Mechanisms
การหาเพลงมาใช้ทายชื่อเพลงมีความซับซ้อน เนื่องจาก API มักจะไม่มีคลิปเสียงแจกฟรี 100%:
*   `musicService.ts` จะเริ่มจากการอ่าน Spotify Playlist (หรือหมวดหมู่ที่เลือก)
*   นำรายชื่อเพลงไปค้นหาผ่าน Spotify API เพื่อดึง `preview_url` (คลิปเสียง 30 วิ)
*   **Fallback 1:** หาก Spotify API ไม่คืนค่าคลิปเสียง ระบบจะนำชื่อเพลงและศิลปินไปค้นหาใน **iTunes Search API** เพื่อดึงคลิปเสียงจาก Apple Music แทน
*   **Fallback 2:** หากค้นจากอินเทอร์เน็ตไม่เจอเลย หรือผู้ใช้ไม่มี Spotify API Keys ระบบจะดึงฐานข้อมูลเพลงสำรอง (Static Fallback Data) จาก Local/MongoDB เพื่อให้เกมยังคงเดินต่อไปได้โดยไม่ Error

### 3. ระบบ Socket.io Lifecycle ใน Multiplayer
การจัดการ State ระหว่างผู้เล่นหลายคนอาศัย Socket.io Event Loop อย่างเข้มงวด:
*   `join_room` / `create_room` -> ตรวจสอบรหัสผ่าน, บรอดคาสต์รายชื่อผู้เล่นใหม่ (`room_updated`)
*   `toggle_ready` -> เช็คความพร้อมของทุกคน หาก Host พร้อมและทุกคนกด Ready เกมจะเริ่ม
*   `start_game` -> Server ดึงข้อมูลเพลง -> เปลี่ยนสถานะเป็นหน้าเล่นเกม -> `game_started`
*   **Tick Loop:** `GameEngine` ใช้ `setInterval` ในการนับเวลาถอยหลัง (Tick) ส่งอัปเดตไปให้ Client ทุกๆ 1 วินาที (`timer_update`)
*   `submit_guess` -> Client ส่งช้อยส์ที่เลือก Server จะบันทึกไว้ (ยังไม่บอกว่าถูกผิด) รอจนหมดเวลาหรือทุกคนตอบครบ
*   `round_result` -> บรอดคาสต์คะแนนที่ได้ในรอบนั้น และอัปเดต Leaderboard สดๆ ทันที (พร้อมทำ Animation สลับตำแหน่ง)

### 4. Frontend State Management (Zustand)
`gameStore.ts` เป็นหัวใจของฝั่ง Client ทำหน้าที่ 3 ส่วน:
1.  **State Storage:** เก็บข้อมูล Player, Room, เวลาที่เหลือ, และข้อมูลรอบปัจจุบัน
2.  **Socket Listeners:** ทำหน้าที่ `socket.on(...)` เพื่อรับคำสั่งจาก Server และอัปเดต UI ทันทีโดยไม่ต้องให้ Component มารอรับ Event เอง
3.  **Actions:** ฟังก์ชันสำหรับควบคุม UI (เช่น `setScreen()`) หรือจัดการโหมด Single Player แบบ Local

---

## 🚀 ฟีเจอร์หลัก (Features)

*   **โหมด Single Player:** เล่นคนเดียว, กำหนดจำนวนเพลง/เวลา/ความยากได้ตามใจชอบ
*   **โหมด Multiplayer:** สร้างห้อง/เข้าร่วมห้องแบบ Real-time, ระบบ Ready, ระบบนับเวลา Sync เป๊ะตรงกันทุกเครื่อง
*   **Spotify Custom Playlist:** รองรับการวางลิงก์ Spotify Playlist ส่วนตัวมาทำเป็นแบบทดสอบ
*   **Dynamic Visualizer:** คลื่นความถี่เสียงกระเพื่อมตามจังหวะเพลง (Web Audio API)
*   **Dynamic Leaderboard:** แสดงตารางคะแนนแบบ Animation ขยับขึ้นลง (Framer Motion)
*   **Multi-language Support:** รองรับภาษาไทยและอังกฤษผ่านไฟล์ `translations.ts`

---

## 📁 โครงสร้างโปรเจกต์ (Folder Structure)

```text
Wutdasong/
├── client/                 # React 18 + Vite (Frontend)
│   ├── src/
│   │   ├── assets/         # ไฟล์รูปภาพ/มีเดีย
│   │   ├── components/     # Component สารพัดประโยชน์ (Visualizer, Wave Background, Modals)
│   │   ├── hooks/          # Custom Hooks (useAudio สำหรับ Web Audio API)
│   │   ├── pages/          # หน้าหลักแต่ละส่วน (Home, Setup, Lobby, Game, Result)
│   │   ├── store/          # Zustand State Management & Socket listeners
│   │   ├── utils/          # ไฟล์ตัวช่วย เช่น ระบบภาษา (translations.ts)
│   │   ├── App.tsx         # จุดเชื่อมต่อการจัดการ Screen State 
│   │   └── index.css       # สไตล์ชีทส่วนกลางแบบ Vanilla CSS (ใช้ CSS Variables)
│
└── server/                 # Node.js + Express + Socket.io (Backend)
    ├── src/
    │   ├── db/             # คลังข้อมูล (MongoDB schema และ Static Fallback Data)
    │   ├── game/           # GameEngine (Logic เกม) และ RoomManager (จัดการห้อง)
    │   ├── services/       # บริการภายนอก (Spotify & iTunes API search / musicService)
    │   └── index.ts        # จุดเริ่มต้นของ Express Server, Routing และ Socket handlers
```

---

## 🛠️ วิธีการติดตั้งและเริ่มใช้งาน (Getting Started)

### ความต้องการของระบบ (Prerequisites)
* [Node.js](https://nodejs.org/) (เวอร์ชัน 18 ขึ้นไป)
* บัญชี MongoDB Atlas (หรือ Local MongoDB) สำหรับเก็บ Leaderboard
* บัญชี Spotify Developer (สำหรับขอ Client ID / Client Secret)

### 1. การตั้งค่าฝั่ง Server (Backend)
1. เข้าไปยังโฟลเดอร์ `server`:
   ```bash
   cd server
   ```
2. ติดตั้ง Dependencies:
   ```bash
   npm install
   ```
3. ตั้งค่าสภาพแวดล้อม (Environment Variables) โดยสร้างไฟล์ `.env` ที่มีข้อมูลดังนี้:
   ```env
   PORT=5000
   MONGODB_URI="your_mongodb_connection_string"
   # หากไม่มี Spotify API credentials ตัวเซิร์ฟเวอร์จะสุ่มเพลงผ่าน iTunes Search API แทนอัตโนมัติ
   SPOTIFY_CLIENT_ID="your_spotify_client_id"
   SPOTIFY_CLIENT_SECRET="your_spotify_client_secret"
   ```
4. รันเซิร์ฟเวอร์ในโหมดพัฒนา (Development):
   ```bash
   npm run dev
   ```

### 2. การตั้งค่าฝั่ง Client (React Frontend)
1. เปิด Terminal ใหม่แล้วเข้าไปยังโฟลเดอร์ `client`:
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
