# Ruo UFMS — Change Log

All notable changes to the Ruo (University Facility Management System) project will be documented in this file.

## [2.7.0] - 2026-09-25 (Phase 2 Equipment Inventory - UC-3.7 & QR-SCAN)

### Added
- **UC-3.7 (Create Equipment)**: Implemented `POST /api/equipments` endpoint in `equipmentController.js` and mounted in `equipmentRoutes.js`.
  - Enforces mandatory validation for `assetCode`, `name`, `category`, `originalPrice`, `purchaseDate`.
  - Checks unique `assetCode` constraint returning `409 Conflict` on duplicates.
  - Auto-generates immutable `qrCodeData` token (`QR-EQ-<timestamp>-<hash>`).
  - Automatically initializes `remainingValue = originalPrice`.
  - Audits asset creation in `AuditLog` with action `EQUIPMENT_CREATE`.
  - Protected with `protect` and `requireRole(USER_ROLES.FACILITY_STAFF, USER_ROLES.ADMIN)`.
- **QR-SCAN (QR Code Lookup)**: Optimized `GET /api/equipments/qr/:qrCode` endpoint with populated `category`, `room`, `supplier` data structures.
- **Automated Integration Test**: Created integration test suite `server/src/tests/test_uc37_qr.js` covering 5 test cases (TC1-TC5: Creation success, 409 conflict, 400 bad request, 200 QR lookup, 404 QR lookup).

### Architectural Decisions
- **Immutable QR Token Generation**: Implemented server-side token generation (`QR-EQ-${Date.now()}-${hash}`) to guarantee tamper-resistance and ensure QR codes remain valid even if asset display codes are reformatted.
- **Mongoose Model Registration**: Added explicit `Room` model imports in `equipmentController.js` to guarantee populating room metadata across all equipment queries.
