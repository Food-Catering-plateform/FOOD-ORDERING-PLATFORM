# UniEats- Campus Food Ordering Platform

A web-based campus food ordering platform built with React 18 and Firebase. The platform supports three user roles , **student**, **vendor**, and **admin** , each with a tailored interface. Payments are processed via PayFast and order-ready email notifications are sent via EmailJS.

---

## Prerequisites

- Node.js v18 or later
- npm (bundled with Node.js)

---

## Getting Started

All Firebase, EmailJS, and PayFast credentials are already included in the `.env` file in the repository — no external account setup is needed.

### 1. Clone the Repository
```bash
git clone https://github.com/your-org/food-ordering-platform.git
cd food-ordering-platform
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Run the App
```bash
npm start
```

The app runs at `http://localhost:3000`.

---

## User Roles & Flows

- **Student** — registers with a student number or Google email. Can browse vendors, add items to basket, and pay via PayFast.
- **Vendor** — registers with a staff number and business name. Store requires admin approval (in the vendor POV, in a page called "Vendors") before being sent to the dashboard. On first login, completes a multi-step StoreSetup (Basic Info → Location & Hours → Branding → Review) before accessing the dashboard.
- **Admin** — manually approved. Manages vendor approvals and platform oversight via the Admin Dashboard.

---

## Project Structure
