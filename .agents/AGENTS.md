# Antigravity Rules for Wutdasong Project

## Coding Style
- เขียน Code เป็น TypeScript/TSX เสมอ พยายามหลีกเลี่ยงการใช้ `any` ถ้าไม่จำเป็น
- ใช้ React Functional Component และ Hooks เสมอ
- การปรับปรุง UI ให้เน้นดีไซน์ที่ดู Premium, Modern, Responsive และเพิ่ม Animations เล็กน้อยเสมอ
- ใช้ CSS variables และ Vanilla CSS เป็นหลักตามโครงสร้างเดิมของโปรเจกต์
- การตั้งชื่อตัวแปรให้ใช้ `camelCase`

## Workflow & Communication
- อธิบายโค้ดโดยการเขียนคอมเมนต์กำกับเป็นภาษาไทยสั้นๆ ไว้เหนือบรรทัดสำคัญเสมอ
- ห้ามแก้ไขโค้ดส่วนที่เกี่ยวกับ Core Game Logic (อาทิ `GameEngine.ts`) ถ้าไม่ได้รับอนุญาตหรือร้องขออย่างชัดเจน
- หากมีการเปลี่ยนแปลง UI สำคัญ ให้อัปเดต Artifact Walkthrough ทุกครั้ง

## Project Architecture & Tech Stack
- **Backend:** Express + Socket.IO + MongoDB (ใช้ Mongoose) 
- **Frontend:** React + Vite + Zustand (Store) + Axios
- **Game State:** บริหารจัดการแบบ Real-time ผ่าน `gameStore.ts` และเชื่อมเข้ากับ Socket.IO
