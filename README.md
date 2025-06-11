# 🏨 Hotel Booking System

A full-stack Hotel Booking System built with **Node.js**, **Express**, and **MongoDB**. This system allows users to register, login, book rooms by category, and lets administrators manage bookings. It also supports role-based access and booking PDF generation.

---

## ✨ Features

- 🔐 User registration and authentication
- 🧾 Room booking based on category and availability
- 📆 Date-based booking with validation (e.g., up to 3 days from today)
- 📑 Admin panel to view all bookings by date
- 📄 PDF generation for booking summaries
- ✅ Room availability check with capacity management
- 🌐 REST API with organized routes
- 🛡️ Middleware-based role protection (Admin & End User)

---

## 🏗️ Tech Stack

- **Backend:** Node.js, Express.js
- **Database:** MongoDB (Mongoose ODM)
- **Authentication:** JSON Web Token (JWT)
- **PDF Generator:** pdfmake
- **Others:** ExcelJS, body-parser

---

## 📁 Project Structure
hotelbooking/
├── controllers/
│ ├── booking.js
│ ├── category.js
│ ├── login.js
│ └── room.js
├── routes/
│ └── v1/
│ ├── admin/
│ │ └── admin.js
│ ├── enduser/
│ │ └── enduser.js
├── models/
│ ├── booking.js
│ ├── category.js
│ ├── room.js
│ └── token.js
├── config/
│ ├── config.gmail.env
│ ├── email.js
│ └── firebasekey.json
├── index.js # App entry point
├── package.json
└── README.md



---

## 🚀 Getting Started

### 1. Clone the Repository

```bash
git clone https://github.com/your-username/hotelbooking.git
cd hotelbooking




