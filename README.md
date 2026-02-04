UniTn-SDE-Project
Project Exam – Service Design and Engineering

# 🏥 MEDICAL BOOKING SYSTEM – SDE PROJECT 2026

A distributed medical appointment booking system based on a microservices architecture.
The system is built using Node.js, Docker, MySQL, and the Quasar Framework, and follows an orchestration pattern.

## 🏗️ SYSTEM ARCHITECTURE

The architecture follows a centralized orchestration model where the **Process Service** acts as a Gateway and coordinator between specialized services.

Services overview:

- Process Service (Gateway)
  - API orchestration
  - Authentication and API key validation
  - Inter-service communication

- Data Service
  - MySQL database access
  - Appointment persistence
  - Core business data handling

- Business Service
  - Medical rules processing
  - Doctor availability logic

- Adapter Service
  - Integration with external APIs
    - Nominatim (geolocation and address search)
    - SMTP (email notifications and OTP delivery)

- Database
  - MySQL persistent storage

---

## 🚀 GETTING STARTED

## Prerequisites

- Docker
- Docker Compose
- Node.js (v18 or higher recommended)
- Git

---

## 🛠️ QUICK START (AUTOMATED)

A master launcher script is provided to start the entire system automatically.
It handles Docker builds, database initialization, seeding, and frontend startup.

1. Clone the repository:

   git clone https://github.com/OmarBonfanti/UniTn-SDE-project.git

   cd UniTn-SDE-project

2. Launch the full system:

   node start.js

The script performs the following steps:

- Builds and starts backend Docker containers
- Waits for the MySQL database to be ready
- Executes the `seed.js` script to populate initial data
- Starts the Quasar development server for the frontend

---

## 💻 MANUAL SETUP

If you prefer running components independently:

---

1. Backend (Docker)

   cd medical_backend

   docker compose up -d --build

2. Database Seeding

   After containers are running, populate the database with doctors and clinics:

   docker exec -it medical_backend-process-service-1 node seed.js

3. Frontend (Quasar)

   cd medical_frontend
   npm install
   npm run dev

---

## 🔌 API DOCUMENTATION & SECURITY

All Gateway endpoints are protected using an API Key middleware.

Required HTTP Header:
x-api-key: medical_exam_2026

Main endpoints:

- POST /api/search
  Search for doctors and clinics (orchestrated request)

- POST /api/book
  Confirm an appointment and send confirmation email

- GET /api/autocomplete
  Location suggestions via Adapter Service (Nominatim)

- POST /api/otp/send
  Send OTP verification code via email

---

## 📝 MONITORING & DEBUGGING

To inspect orchestration and service interactions:

docker compose -f medical_backend/docker-compose.yml logs -f process-service

---

## 🎓 ACADEMIC INFORMATION

University: University of Trento (UniTn)
Course: Software Development Engineering
Academic Year: 2025 / 2026

Project Focus Areas:

- Microservices architecture
- Docker containerization
- API orchestration
- External API integration
- Distributed system design

---
