# 📍 NearNow (LocalO)

**Connecting local communities with their favorite nearby vendors. Fresh, fast, and familiar.**

NearNow is a mobile-first local commerce platform designed for hackathons. It helps users find nearby vendors—including both fixed shops and moving stalls (like fruit carts)—in real-time.

## 🚀 Key Features

### **For Customers**
- **Real-time Discovery**: Find vendors based on your current GPS location.
- **Smart Filters**: Filter by category (Food, Fruits, Services, etc.), radius, and online status.
- **Interactive Catalog**: Browse vendor items and prices before ordering.
- **One-Tap Directions**: Integrated with Google Maps for easy navigation.
- **Multi-language Support**: Full support for **English** and **Hindi**.
- **Auto-Guided Tour**: Interactive walkthrough for first-time visitors.

### **For Vendors**
- **Easy Onboarding**: 5-step registration with selfie verification and GPS capture.
- **Live Status**: Toggle your shop "Online" or "Offline" in one tap.
- **Moving Stall Support**: Update your live location daily so customers can always find you.
- **Catalog Management**: Add/edit items, manage stock levels, and set prices.
- **WhatsApp Notifications**: Receive instant alerts for new orders via Twilio WhatsApp API.
- **Vendor Dashboard**: Overview of today's revenue, pending orders, and catalog limits.

### **For Admins**
- **Verification Portal**: Review and approve/reject vendor applications.
- **Plan Management**: Manage vendor tiers (Free vs Pro) and catalog limits.
- **Order Monitoring**: Oversight of all platform transactions.

---

## 🛠️ Tech Stack

- **Frontend**: React 18, Vite, TypeScript
- **Styling**: Tailwind CSS, shadcn/ui
- **Backend/Database**: Supabase (PostgreSQL, Auth, Storage, Edge Functions)
- **Notifications**: Twilio WhatsApp API
- **Guidance**: driver.js (Interactive Tours)
- **Internationalization**: i18next (EN/HI)
- **Reliability**: Global Error Boundary & TypeScript strict mode

---

## 📦 Getting Started

### **Prerequisites**
- Node.js (LTS version recommended)
- npm or yarn

### **Local Setup**

1.  **Clone the repository**:
    ```bash
    git clone https://github.com/alphacoder-hash/localo.git
    cd localo
    ```

2.  **Install dependencies**:
    ```bash
    npm install
    ```

3.  **Environment Variables**:
    Create a `.env` file in the root directory and add your Supabase and Twilio credentials:
    ```env
    VITE_SUPABASE_URL=your_supabase_url
    VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
    TWILIO_ACCOUNT_SID=your_twilio_sid
    TWILIO_AUTH_TOKEN=your_twilio_token
    TWILIO_WHATSAPP_FROM=your_twilio_whatsapp_number
    ```

4.  **Run the development server**:
    ```bash
    npm run dev
    ```
    Open [http://localhost:8080](http://localhost:8080) in your browser.

---

## 🛡️ Stability & Security

- **Database Triggers**: Catalog limits are enforced at the database level to prevent API abuse.
- **Protected Routes**: Custom hooks and components (`RequireAuth`, `RequireRole`) manage access control.
- **Error Handling**: A global `ErrorBoundary` prevents the app from crashing on unexpected UI errors.
- **Optimized Loading**: Session-based auth state management prevents "flickering" UI during login.

---

## 🇮🇳 Localization

NearNow is built for the Indian market. All core features, tours, and notifications are fully translated into **Hindi** to ensure accessibility for local vendors.

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
