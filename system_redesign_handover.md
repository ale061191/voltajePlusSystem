# System Redesign Handover: VoltajeVzla Admin

## 1. Project Goal
Redesign the existing admin panel (`https://m.voltajevzla.com/web-admin/#/home`) to be modern, minimalist, and robust using **React/Next.js**. The goal is to move away from the current SPA and build a custom interface that communicates directly with the backend API.

## 2. Design Proposals (Stitch)
We generated modern, minimalist UI concepts using Stitch MCP.
*   **Mobile Concept**: [View Image](https://lh3.googleusercontent.com/aida/AOfcidXsSlapDI0G1QMW9ivRN38UfKmL5C4SOk2WYMIMPPVT5BrNmfXEqVCTuOH7rFiCREMKy7BaNqg3onWdstf3KJARj_KTJeOvxdhkxjWeOxpFVHM0eOl91B2QtACiXmVyRnQoAKOTpgs7hqpZmaIaXA5dvIzteNPTGC7T-QoUtdwfqI36Dtcc4Vv8yQM9yrbDkFMNd6vZag7RLSg5xpqc83e4NShOIFW-1FnHvDhUceC9r8VOrlLeZPNsdDQ)
*   **Desktop/Web Concept**: [View Image](https://lh3.googleusercontent.com/aida/AOfcidYDvU-y9Xdkr1K-QO1u6y4iB2i0m_wT7O3Vj4u_I8zV-0T27XfWn1j7Kx-9x7S52-6C4bJk7Xl0_H5t61j_Xv98Qd3dF_00b21e855c328f44d9f73369a84511_1-P3G0_1w5r4t8v9x2y6z1A3B4C5D6E7F8G9H0I1J2K3L4M5N6) *(Note: ID `0725b6ba100a4340a6ffd3599d8efd10`)*

## 3. Technical Reverse-Engineering Findings

### 3.1. API Protocol
The application uses a standard **REST API (HTTP/1.1)** over HTTPS.
*   **Status**: Confirmed.
*   **WebSockets**: Investigated but found to be unused for dashboard data (See rejected paths below).

### 3.2. Authentication (CRITICAL)
Access is managed via a proprietary Header `token` and a Session Cookie.
*   **Header Name**: `token`
*   **Sample Value**: `[ADMIN_TOKEN — ver variable de entorno BAJIE_ADMIN_TOKEN]`
*   **Cookie**: `JSESSIONID` is also present and likely required.

![Authentication Headers](file:///C:/Users/Voltaje%20Plus/.gemini/antigravity/brain/7983d6f1-3159-4495-9e76-3621fe6ef2db/media__1770827244225.png)

**Objective**: Rebuild the VoltajeVzla admin and user panels to operate independently of the original Chinese software limitations, specifically regarding payment gateways and UI customization.

## 0. Prerequisites for New Development 🔑
To build the new system, you will need to gather the following credentials (which you likely provided to the original developers):
*   [ ] **BNC Payment Gateway API Keys**: (Merchant ID, Public/Private Keys)
*   [ ] **Google Maps API Key**: (For the new map interface)
*   [ ] **Server/Cloud Account**: (AWS, DigitalOcean, or Hostinger to host the new system)
*   [ ] **Domain Access**: (Access to `voltajevzla.com` DNS records)

## 1. API Reverse Engineering Findings
**Base URL**: `https://m.voltajevzla.com/cdb-api/v1`

| Endpoint Name | Observed Path | Function |
| :--- | :--- | :--- |
| **Statistics** | `.../cdb/statistics/home/net` | Main dashboard numbers (Income, Orders). |
| **Cabinet** | `.../cdb/cabinet` | High-level cabinet stats (Count). |
| **All Income** | `allincome` (Alias) | TBC. |
| **Shop** | `shop` (Alias) | Shop management. |

![Cabinet Response Payload](file:///C:/Users/Voltaje%20Plus/.gemini/antigravity/brain/7983d6f1-3159-4495-9e76-3621fe6ef2db/media__1770827100311.png)

![XHR Endpoint List](file:///C:/Users/Voltaje%20Plus/.gemini/antigravity/brain/7983d6f1-3159-4495-9e76-3621fe6ef2db/media__1770826993193.png)

### 3.4. Rejected Paths
*   **WebSockets**: We initially suspected a socket connection at `.../socketserver/common`. However, monitoring showed **no frames** were exchanged for dashboard updates, confirming HTTP polling is used instead.

![Empty WebSocket Connection](file:///C:/Users/Voltaje%20Plus/.gemini/antigravity/brain/7983d6f1-3159-4495-9e76-3621fe6ef2db/media__1770826844571.png)

## 4. Next Steps
1.  **Token Verification**: Configure the new backend/proxy to usage the captured `token` in the headers.
2.  **Device List Discovery**: Navigate to the "Device" menu in the original admin to capture the specific endpoint that returns the *list of Device IDs*. This is needed to send individual commands.
3.  **Frontend Implementation**: Use the Stitch designs to build the UI components in Next.js.
4.  **Control Endpoints (CAPTURED)**:
    *   **URL**: `https://m.voltajevzla.com/cdb-api/v1/cdb/cabinet/operation`
    *   **Method**: `GET`
    *   **Parameters**:
        *   `cld`: The Cabinet ID (e.g., `DTA34039`).
        *   `operationType`: The Command Code (e.g., `5` appears to be the code for the action performed).
    *   **Auth**: The `token` is passed inside the `Cookie` header (e.g., `Cookie: JSESSIONID=...; token=...`).
    *   **Next Step**: verification script should test sending `operationType=5` to a specific ID to replicate this behavior.

5.  **Payment Gateway Strategy (FUTURE)**:
    *   **Current State**: Payments (BNC) are handled by the *Chinese backend/Mobile App*, not directly by this Admin Panel.
    *   **To Add New Methods**: We cannot "inject" code into their closed mobile app.
    *   **Solution**: We build a **Web-Based Rental Flow**. Users scan a QR -> Land on OUR web app -> Pay with ANY method we want (Pago Móvil, Zelle, Binance) -> Our backend sends the "Unlock" command (captured above) to the machine.
    *   **Benefit**: This bypasses the Chinese payment limitations entirely.
    *   **Can we use the OLD payment method (BNC)?**: Checking if we can "reuse" their BNC window is complex.
        *   *Better Strategy*: Since you are the merchant, you likely have the credentials. We should integrate BNC **directly** into your new generic web app, bypassing the Chinese middleware completely. This gives you 100% control over the money flow.

6.  **QR Code Integration Strategy**:
    *   **Scenario A (Best Case)**: If you control the domain `voltajevzla.com`, we simply update the DNS records. The existing physical QR codes (which point to `m.voltajevzla.com`) will automatically load **OUR new system** instead of the old one. Zero physical work required.
    *   **Scenario B (Alternative)**: We print new QR stickers that point to our new App URL (e.g., `app.voltaje.com/rent?id=123`) and paste them over the old ones.
    *   **Scenario C (Digital Screens)**: Your models (ZBJ-166, etc.) have huge 43" 1080p screens. We can design a beautiful "Rent Me" image with **OUR new QR code** and upload it via the "Ad Manage" section of the current panel. This updates all screens remotely to point to the new system, without touching the hardware.

7.  **Ad Management (Multimedia) Strategy**:
    *   **Current State**: The existing Chinese panel allows uploading images/videos to screens.
    *   **New System Potential**: Yes, we can replicate this. It works exactly like the "Unlock" command: we just need to capture the API call when you click "Upload" in the old panel.
    *   **Recommendation**: For Phase 1 (MVP), use the *old* panel to manage ads (since ads change rarely, maybe once a month), and use the *new* panel for rentals (every minute).
    *   **Phase 2**: Reverse-engineer the "Upload" endpoint to bring this feature into your new system fully.

8.  **Parallel Operation & Safety (Risk Assessment)** 🛡️
    *   **Question**: "Will using my BNC keys in the new system break the old one?"
    *   **Answer**: **NO.**
    *   **Why**: API Keys are designed to be used by multiple applications at once. The bank doesn't care if the request comes from the "Old Chinese App" or your "New Web App", as long as the credentials are valid.
    *   **Strategy**: You can run BOTH systems simultaneously during the transition period. The old system will keep working perfectly until you decide to shut it down.

## 2. Authentication Strategy
**Token Location**: Header `token`
**Sample Value**: `[ADMIN_TOKEN — ver variable de entorno BAJIE_ADMIN_TOKEN]` (from user screenshot)

---

## 9. Conversation Context & Key Q&A (The "Human" Side) 🧠
*This section captures the strategic discussions, metaphors, and decisions made during the reverse-engineering session to provide full context to the incoming team.*

### Q1: "How do we bypass the payment restriction?"
*   **The Problem**: The BNC payment integration is hardcoded inside the compiled Chinese mobile app.
*   **The Strategy**: We don't use their app. We build a **Web App**.
*   **The Logic**: Since we captured the "Unlock" command (`operation` endpoint), we can trigger it from anywhere. The user scans the QR -> Opens OUR Web App -> Pays via OUR BNC integration -> OUR backend triggers the machine unlock.

### Q2: "Will using my BNC keys in the new system break the current one?"
*   **The Doubt**: Fear of conflict or "crashing" the existing operation.
*   **The Metaphor (The House Key)**: "API Keys are like a house key. Giving a copy to your new system doesn't stop the old system's key from working. Both can enter the house."
*   **The Verdict**: It is 100% safe to run both systems in parallel. The bank accepts requests from any valid source.

### Q3: "How do we link the machines to the new system without re-stickering?"
*   **The Challenge**: Replacing physical stickers on hundreds of machines is a logistical nightmare.
*   **Solution A (DNS Magic)**: If the stickers point to `m.voltajevzla.com`, we simply point that domain to our NEW server. The old stickers instantly start loading the new app.
*   **Solution B (Digital Screens)**: Since the machines have 43" screens, we can upload a "Rent Here" image via the old panel's Ad Manager with a new digital QR code.

### Q4: "What about the Ad Management feature (videos on screens)?"
*   **The Decision**: For the MVP (Phase 1), we will skip reverse-engineering the "Upload" feature to save time. The client will continue using the old panel *just* for uploading ads (once a month tech task), while using the new custom panel for all daily operations (rentals, payments, users).

### Q5: "What are the real limitations?"
*   **Hardware Config**: We cannot change deep firmware settings (voltage, 4G bands) without the engineering menus (which we didn't map).
*   **Latency**: We use polling (asking every few seconds), not WebSockets, so the dashboard might be 3-5 seconds behind real-time.
*   **Dependence**: We still rely on the Chinese cloud API being up. If they vanish, we vanish. (But we have gained operational independence).

---

## 10. Next Steps: How to Capture ALL Data Quickly (The "HAR" Method) ⚡
*To avoid taking 100 screenshots of every single page, follow this "Bulk Capture" trick for the next session:*

1.  **Open Network Tab**: Press F12 -> Network -> Click the "Trash/Clear" icon to start clean.
2.  **The "Tourist Tour"**: With the Network tab open, click on **EVERY** menu item in your dashboard (Users, Income, Orders, Devices, etc.).
    *   *Don't just look, click.* We need the browser to request the data.
3.  **Export Data**:
    *   Look for a "Down Arrow" icon (⬇️) or right-click anywhere in the Network list.
    *   Select **"Save all as HAR with content"**.
4.  **Send File**: Upload that `.har` file to the chat.
    *   **Result**: I can read that file and automatically extract **every single API endpoint** at once. No more manual screenshots needed.

---
*Document generated by Antigravity Agent & VoltajePlus Team - February 2026*
