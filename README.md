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

- **Student** - registers with a student number or Google email. Can browse vendors, add items to basket, and pay via PayFast.
- **Vendor** - registers with a staff number and business name. Store requires admin approval (in the vendor POV, in a page called "Vendors") before being sent to the dashboard. On first login, completes a multi-step StoreSetup (Basic Info → Location & Hours → Branding → Review) before accessing the dashboard.
- **Admin** - manually approved. Manages vendor approvals and platform oversight via the Admin Dashboard.

---

## Project Structure

```
src/
├── App.js                          # Root component; handles auth state and routing
├── Firebase/
│   └── firebaseConfig.js           # Firebase initialisation (auth, db, storage)
├── Context/
│   ├── AuthContext.jsx             # Auth state via onAuthStateChanged; exposes currentUser + role
│   └── CustomerOrdersContext.jsx   # Order state for the customer flow
├── Services/
│   ├── AuthContext.js              # Vendor-facing auth context (exposes vendorId)
│   ├── Register.jsx                # Registration hook used by all signup forms
│   ├── Login-backend.jsx           # Login logic
│   ├── vendorService.js            # Firestore helpers for vendor data
│   └── pickupReadyEmail.js         # EmailJS integration for pickup notifications
├── Routes/
│   └── ProtectedRoute.jsx          # Route guard by role
├── components/
│   ├── login-and-signup/           # Login, signup forms (student, vendor, admin), forgot password
│   ├── Vendor/
│   │   ├── VDashboard.js           # Vendor shell with sidebar nav
│   │   ├── VenHome.js              # Vendor home/overview
│   │   ├── MenuManagement.js       # Menu CRUD
│   │   ├── Orders.js               # Incoming order management
│   │   ├── Analytics.js            # Sales analytics + CSV/PDF export
│   │   ├── AccSettings.js          # Account settings
│   │   ├── StoreSetup.js           # First-time store profile setup (4-step wizard)
│   │   └── tests/                  # Jest/RTL test suites for all vendor components
│   ├── Customer/
│   │   └── jsFiles/                # Dashboard, Shops, MenuView, Basket, Orders, Payment, Profile
│   ├── Admin/                      # Admin dashboard and vendor management
│   └── Navbar/ Sidebar/            # Shared navigation components
├── Assets/                         # Static images and asset exports
└── utils/
    └── notificationReadState.js    # Notification read/unread state helpers
```

---

## Running Tests

Tests use Jest and React Testing Library, configured inside `package.json`.

```bash
# Run all tests (no watch mode)
npm test

# Run a specific test file
npm test -- --testPathPattern=MenuManagement

# Run with coverage report
npm test -- --coverage
```

Coverage output is written to the `coverage/` directory.

---

## CI/CD

GitHub Actions runs tests with coverage on every push to `main` and on all pull requests. Coverage is uploaded to Codecov.

The workflow file is at `.github/workflows/coverage.yml`.
