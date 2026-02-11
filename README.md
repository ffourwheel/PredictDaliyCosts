# Daily Expense Predictor — ทำนายค่าใช้จ่ายรายวัน

เว็บแอปพลิเคชันสำหรับทำนายค่าใช้จ่ายรายวัน โดยใช้ **Multiple Linear Regression** จาก scikit-learn ผู้ใช้เก็บข้อมูลพฤติกรรมของตัวเองอย่างน้อย 7 วัน แล้วระบบจะสร้างโมเดลเพื่อทำนายค่าใช้จ่ายในอนาคต

> **วิชา:** AIE322 — Artificial Intelligence Engineering  
> **เทคโนโลยี:** Python Flask · scikit-learn · SQLite · HTML/CSS/JS  
> **GitHub:** [github.com/ffourwheel/PredictDaliyCosts](https://github.com/ffourwheel/PredictDaliyCosts)

---

## จุดประสงค์

1. เก็บรวบรวมข้อมูลค่าใช้จ่ายและพฤติกรรมประจำวันของผู้ใช้
2. สร้างโมเดล Multiple Linear Regression จากข้อมูลจริงที่เก็บมาเอง
3. ประเมินประสิทธิภาพโมเดล (R², MAE, MSE, RMSE)
4. ทำนายค่าใช้จ่ายรายวันจาก 5 ตัวแปรอิสระ
5. แสดงผลผ่านเว็บแอปพลิเคชันที่สวยงามและใช้งานง่าย

---

## โครงสร้างโปรเจค

```
PredictCost/
├── app.py                  # Flask backend + REST API + auto-install deps
├── model.py                # ML module (train / test / evaluate / save)
├── requirements.txt        # Python dependencies
├── Procfile                # สำหรับ deploy บน cloud
├── .gitignore
├── README.md
│
├── templates/
│   └── index.html          # หน้าเว็บหลัก (Single Page App, 4 แท็บ)
│
├── static/
│   ├── style.css           # Dark glassmorphism theme
│   └── script.js           # Frontend logic + animations
│
├── data/                   # (สร้างอัตโนมัติตอนรัน)
│   └── expenses.db         # ฐานข้อมูล SQLite
│
└── saved_model/            # (สร้างอัตโนมัติตอน train)
    ├── expense_model.joblib # โมเดลที่บันทึกไว้
    └── metrics.json         # ผลการประเมินโมเดล
```

---

## โครงสร้างข้อมูล

### ตัวแปรอิสระ (Independent Variables) — 5 ตัว

| ลำดับ | ชื่อตัวแปร | คำอธิบาย | ช่วงค่า | ประเภท |
|:---:|---|---|---|---|
| 1 | `meals_out` | จำนวนมื้อที่ทานข้าวนอกบ้าน | 0 – 5 มื้อ | Integer |
| 2 | `travel_distance` | ระยะทางเดินทางในวันนั้น | 0+ กิโลเมตร | Float |
| 3 | `shopping_score` | คะแนนการช้อปปิ้ง/ความบันเทิง | 0 – 10 คะแนน | Integer |
| 4 | `activities` | จำนวนกิจกรรมหรือนัดหมาย | 0 – 10 กิจกรรม | Integer |
| 5 | `sleep_hours` | จำนวนชั่วโมงนอน | 0 – 24 ชั่วโมง | Float |

### ตัวแปรตาม (Dependent Variable)

| ชื่อตัวแปร | คำอธิบาย | หน่วย |
|---|---|---|
| `daily_expense` | ค่าใช้จ่ายรวมของวันนั้น | บาท (THB) |

### ตัวอย่างข้อมูล

| วันที่ | มื้อนอกบ้าน | ระยะทาง (กม.) | ช้อปปิ้ง | กิจกรรม | ชม.นอน | ค่าใช้จ่าย (฿) |
|---|:---:|:---:|:---:|:---:|:---:|---:|
| 2026-02-05 | 2 | 15.0 | 3 | 2 | 7.5 | 450 |
| 2026-02-06 | 1 | 5.0 | 0 | 1 | 8.0 | 150 |
| 2026-02-07 | 3 | 30.0 | 7 | 4 | 6.0 | 1,200 |
| 2026-02-08 | 0 | 0.0 | 0 | 0 | 9.0 | 50 |
| 2026-02-09 | 2 | 10.0 | 5 | 3 | 7.0 | 650 |
| 2026-02-10 | 1 | 8.0 | 2 | 1 | 8.0 | 280 |
| 2026-02-11 | 4 | 25.0 | 8 | 5 | 5.5 | 1,500 |

> ต้องเก็บข้อมูลอย่างน้อย **7 วัน** (ไม่ซ้ำกัน) ถึงจะสร้างโมเดลได้

---

## วิธีรัน

รันคำสั่งเดียว — ระบบจะติดตั้ง dependencies อัตโนมัติ:

```bash
python app.py
```

จากนั้นเปิดเบราว์เซอร์ไปที่ **http://localhost:5000**

> หากติดตั้งอัตโนมัติไม่ได้ ให้รัน `pip install -r requirements.txt` ก่อน

---

## หน้าเว็บ (4 แท็บ)

| แท็บ | ฟังก์ชัน |
|---|---|
| **บันทึก** | กรอกข้อมูล 5 features + ค่าใช้จ่ายของแต่ละวัน พร้อม progress bar (ป้องกันวันซ้ำ) |
| **ประวัติ** | ดูตารางข้อมูลทั้งหมดที่บันทึกไว้ สามารถลบรายการได้ |
| **สร้างโมเดล** | Train โมเดล + แสดงผลการประเมิน (R², MAE, MSE, RMSE) + สัมประสิทธิ์ + สมการ |
| **ทำนาย** | กรอก 5 features แล้วทำนายค่าใช้จ่าย |

---

## Machine Learning Pipeline

```
ข้อมูลผู้ใช้ (≥ 7 วัน)
       │
       ▼
Train / Test Split (80% / 20%)
       │
       ▼
Multiple Linear Regression (sklearn)
       │
       ▼
Evaluate (R², MAE, MSE, RMSE)
       │
       ▼
Save Model (joblib) ──► Predict
```

### สมการโมเดล

```
ค่าใช้จ่าย = β₀ + β₁(มื้อนอกบ้าน) + β₂(ระยะทาง) + β₃(ช้อปปิ้ง) + β₄(กิจกรรม) + β₅(ชม.นอน)
```

### ตัวชี้วัดการประเมิน (Evaluation Metrics)

| Metric | คำอธิบาย |
|---|---|
| **R² Score** | ค่าความแม่นยำของโมเดล (0 ถึง 1 ยิ่งใกล้ 1 ยิ่งดี) |
| **MAE** | Mean Absolute Error — ค่าเฉลี่ยของความคลาดเคลื่อนแบบสัมบูรณ์ |
| **MSE** | Mean Squared Error — ค่าเฉลี่ยของความคลาดเคลื่อนยกกำลังสอง |
| **RMSE** | Root Mean Squared Error — รากที่สองของ MSE |

---

## เทคโนโลยีที่ใช้

| เทคโนโลยี | เวอร์ชัน | การใช้งาน |
|---|---|---|
| Python | 3.10+ | ภาษาหลัก |
| Flask | 3.1.0 | Web framework |
| scikit-learn | 1.6.1 | Machine Learning (LinearRegression) |
| SQLite | Built-in | ฐานข้อมูล |
| joblib | 1.4.2 | บันทึก/โหลดโมเดล |
| pandas | 2.2.3 | จัดการข้อมูล |
| numpy | 2.2.3 | การคำนวณเชิงตัวเลข |
| HTML/CSS/JS | - | Frontend (Dark Glassmorphism UI) |

---

## API Endpoints

| Method | Endpoint | คำอธิบาย |
|---|---|---|
| `GET` | `/` | หน้าเว็บหลัก |
| `POST` | `/api/record` | บันทึกข้อมูลรายวัน (ไม่ให้วันซ้ำ) |
| `GET` | `/api/records` | ดึงข้อมูลทั้งหมด |
| `DELETE` | `/api/records/<id>` | ลบข้อมูลตาม ID |
| `GET` | `/api/used-dates` | ดึงวันที่ที่บันทึกแล้ว |
| `POST` | `/api/train` | Train โมเดล (ต้องมี ≥ 7 records) |
| `POST` | `/api/predict` | ทำนายค่าใช้จ่าย |
| `GET` | `/api/model-status` | ตรวจสอบสถานะโมเดล |
