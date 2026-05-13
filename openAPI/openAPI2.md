# CHARGENOW / BAJIE CHARGING - UNIFIED API REFERENCE MASTER
**Project:** VoltajeVzla Migration
**Target Architecture:** Flutter (Frontend) + Firebase Cloud Functions (Backend)
**Source:** Official Documentation Engineering (Feb 2026)
**Base URL:** `https://developer.chargenow.top/cdb-open-api/v1`

---

## 1. AUTHENTICATION & HEADERS
**Security Standard:** Basic Authentication.
All HTTP requests to the API must include the following header:

* **Header Key:** `Authorization`
* **Header Value:** `Basic <Base64_String>`

**Generation Logic:**
1.  Concatenate credentials: `ClientGUID` + `:` + `MasterKey`
2.  Encode the resulting string to **Base64**.
3.  Prepend "Basic " (with a space).

> **Note:** Do not send credentials in the JSON body. Only in the Header.

---

## 2. CORE RENTAL API (User App)
*Endpoints required for the Flutter Mobile/Web App.*

### 2.1 Get Device Info (Pre-Rent Check)
* **Method:** `GET`
* **Endpoint:** `/rent/cabinet/query`
* **Query Params:** `deviceId` (Required).
* **Response:** Returns `online: true/false`, `batteries` (array), and `busySlots` (batteries available to rent).
* **Logic:** If `online` is false or `busySlots` is 0, disable the "Rent" button in the UI.

### 2.2 Create Rent Order (UNLOCK/RENT)
* **Method:** `POST`
* **Endpoint:** `/rent/order/create`
* **Purpose:** Dispenses a battery to the user.
* **Query Params:**
    * `deviceId`: string (Required - Scanned from QR).
    * `callbackURL`: string (Required - **CRITICAL**). This must be your Firebase Cloud Function URL (e.g., `https://.../onCabinetEvent`).
* **Response:**
    ```json
    { "code": 0, "data": { "tradeNo": "20260215..." } }
    ```
* **Action:** Save `tradeNo` in Firestore immediately as the active rental Order ID.

### 2.3 Query Rent Order Status
* **Method:** `POST`
* **Endpoint:** `/rent/order/query`
* **Params:** `tradeNo`.
* **Purpose:** Poll this for 5-10 seconds after creation to confirm the battery was physically ejected.

### 2.4 Get Order Detail (Billing/History)
* **Method:** `GET`
* **Endpoint:** `/rent/order/detail`
* **Params:** `tradeNo`.
* **Response Data:** `borrowTime`, `returnTime`, `orderAmount` (Cost).

### 2.5 Get Device List (Map)
* **Method:** `POST`
* **Endpoint:** `/rent/cabinet/list`
* **Query Params:**
    * `lat`: string (User Latitude).
    * `lng`: string (User Longitude).
    * `zoomLevel`: string ("15").
    * `coordType`: string ("WGS-84").

---

## 3. CABINET MANAGEMENT API (Admin)
*Endpoints for the Admin Dashboard to control hardware.*

### 3.1 Device Operation (Remote Control)
* **Method:** `POST`
* **Endpoint:** `/cabinet/operation`
* **Params:**
    * `cabinetId`: string.
    * `operationType`: string. Options:
        * `restart`: Reboot system.
        * `pop`: Pop a slot (requires `slotNum`).
        * `unlock`: Unlock cable.
    * `reason`: string.

### 3.2 Get All Device List (Inventory)
* **Method:** `GET`
* **Endpoint:** `/cabinet/getAllDevicePage`
* **Params:** `page` (1), `limit` (50).
* **Purpose:** Sync your Firestore `Machines` collection with the real fleet.

### 3.3 Binding Device to Shop
* **Method:** `POST`
* **Endpoint:** `/cabinet/bind2shop/{qrcode}/{newshopid}`
* **Purpose:** Assign a machine to a location.

---

## 4. SHOP MANAGEMENT API (Locations)
*Endpoints to manage physical venues (Restaurants, Hotels).*

### 4.1 Create New Shop
* **Method:** `POST`
* **Endpoint:** `/shop/create`
* **Body Params (JSON):**
    * `pNewId`: string (Required - Your custom Shop UUID).
    * `pName`: string (Required).
    * `pJingDu`: string (Required - **LONGITUDE**). *Note: Pinyin naming.*
    * `pWeiDu`: string (Required - **LATITUDE**). *Note: Pinyin naming.*
    * `pContent`: string (Phone/Contact).

### 4.2 Get Shop List
* **Method:** `GET`
* **Endpoint:** `/shop/getAllShopList`

---

## 5. PRICE STRATEGY API (Billing)
*Endpoints to set tariffs.*

### 5.1 Create/Update Strategy
* **Method:** `POST`
* **Endpoint:** `/shop/priceStrategy/saveOrUpdate`
* **Body Params:**
    * `name`: "Standard Rate".
    * `price`: 1.00.
    * `priceTime`: 60 (Minutes per unit).
    * `freeMinutes`: 5 (Grace period).
    * `dailyMaxPrice`: 10.00.
    * `isDeposit`: false.

### 5.2 Bind Price to Shop
* **Method:** `POST`
* **Endpoint:** `/shop/priceStrategy/bindShop`
* **Body Params:** `shopId`, `priceId`.
* **Logic:** Machines inherit the price of the Shop they are bound to.

---

## 6. EVENT PUSH API (Webhooks)
*Real-time feedback loop configuration.*

### 6.1 Configure Push URL
* **Method:** `POST`
* **Endpoint:** `/cabinet/eventPush/config`
* **Body:**
    ```json
    {
      "pushUrl": "[https://YOUR-FIREBASE-REGION-PROJECT.cloudfunctions.net/api/webhook](https://YOUR-FIREBASE-REGION-PROJECT.cloudfunctions.net/api/webhook)",
      "eventSubscriptions": [
        { "event": "BATTERY_BORROW_OUT", "enable": true },
        { "event": "BATTERY_RETURN", "enable": true },
        { "event": "CABINET_OFFLINE", "enable": true }
      ]
    }
    ```

### 6.2 Incoming Webhook Payload (What Firebase Receives)
When an event occurs, the Chinese server POSTs this JSON to your `pushUrl`:

```json
{
  "event": "BATTERY_RETURN",
  "timestamp": "2026-02-15 10:00:00",
  "eventData": {
    "cabinetId": "DTA12345",
    "orderId": "20260215...",  // Use this to close the rental in Firestore
    "slot": 1,
    "vol": 85,
    "returnSlot": 4
  }
}