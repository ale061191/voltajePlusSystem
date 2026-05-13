# Voltaje API Discovery

**Source:** `https://m.voltajevzla.com/static/js/app.6e7fdbf8.js`

## Configuration
*   **Base URL:** `https://m.voltajevzla.com/cdb-app-api/v1/app/`
*   **Android API Key:** `$GOOGLE_MAPS_API_KEY` (Google Maps)
*   **Stripe ID (Live):** `$STRIPE_PUBLISHABLE_KEY`
*   **Facebook App ID:** (Empty in source)
*   **Google App ID:** `629158554548-5fcbci8db7dfvguh242vtocssivm4g43.apps.googleusercontent.com`

## Endpoints
*   `cdb/shop/listnear` (Nearby Stations - POST, Multipart)
    *   Params: `coordType`, `mapType`, `lat`, `lng`, `zoomLevel`, `showPrice`, `usePriceUnit`
*   `cdb/cabinet/checkisok`
*   `cdb/cabinet/zhorder`
*   `cdb/cabinet/useBalanceToRent`
*   `cdb/cabinet/ordercheck`
*   `cdb/cabinet/savedCardToRent`
*   `saas/mobileLogin` (Login)
*   `saas/sendVerifyCodeSms` (OTP)
*   `cdb/user/wallet`
*   `cdb/mine/order/list`
*   `cdb/mine/order/detail`
*   `cdb/shop/details` (implied from vue router)

## Data Models (Inferred)
*   **Cabinet:** `shopname`, `shoplogo`, `jifei` (price), `jifeiDanwei` (unit), `yajin` (deposit), `myyue` (balance).

## Potential Next Steps
1.  Implement `NetworkService` using these endpoints.
3.  **Critical Findings (2026-02-17):**
    *   **Zoom Level:** MUST be `4` to receive detailed station data. `14` returns empty lists in some contexts.
    *   **Field Mapping:**
        *   `freeNum` = Available Batteries (to rent).
        *   `canReturnNum` = Empty Slots (to return).
        *   `batteryNum` = Total Slots/Batteries (likely capacity).
    *   **Hyphen:** `coordType` MUST use full-width hyphen `WGS－84`.
