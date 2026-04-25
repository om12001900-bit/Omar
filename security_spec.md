# Security Specification

## Data Invariants
1. Users can only read and write their own profile.
2. Goals, Hieas, Projects, Conferences, and CalendarEvents are private to their creator (`ownerId`).
3. Only authenticated users can access the database.

## The Dirty Dozen Payloads

### 1. Identity Spoofing (Profile)
**Target:** `/users/user-123`
**Attacker:** `user-456`
**Payload:** `{"displayName": "Hacker", "uid": "user-123"}`
**Expectation:** `PERMISSION_DENIED`

### 2. Unauthorized Read (Goal)
**Target:** `/goals/goal-abc`
**Attacker:** `user-456` (not the owner)
**Action:** `get`
**Expectation:** `PERMISSION_DENIED`

### 3. State Shortcutting (Project Status)
**Target:** `/projects/proj-123`
**Owner:** `user-123`
**Action:** `update`
**Payload:** `{"status": "completed", "progress": 100}` (without actually doing the work)
**Expectation:** `PERMISSION_DENIED` (if status logic is enforced) - for now, I'll allow owner updates.

### 4. Shadow Field Injection
**Target:** `/goals/goal-abc`
**Owner:** `user-123`
**Payload:** `{"name": "New Name", "isVerified": true}`
**Expectation:** `PERMISSION_DENIED` (Strict schema check)

### 5. ID Poisoning
**Target:** `/goals/very-long-id-that-is-way-more-than-128-characters...`
**Attacker:** `any`
**Expectation:** `PERMISSION_DENIED` (ID length/regex check)

### 6. PII Leakage
**Target:** `/users/user-123`
**Attacker:** `any authenticated user (not the owner)`
**Action:** `list`
**Expectation:** `PERMISSION_DENIED`

### 7. Resource Poisoning (Size)
**Target:** `/goals/goal-abc`
**Owner:** `user-123`
**Payload:** `{"name": "A".repeat(1001)}`
**Expectation:** `PERMISSION_DENIED` (String size limit)

### 8. Timestamp Tampering
**Target:** `/goals/goal-abc`
**Owner:** `user-123`
**Payload:** `{"createdAt": "2020-01-01T00:00:00Z"}`
**Expectation:** `PERMISSION_DENIED` (Must use server timestamp on create)

### 9. Orphaned Record (invalid hieaId)
**Target:** `/goals/goal-abc`
**Owner:** `user-123`
**Payload:** `{"name": "Goal", "hieaId": "non-existent-hiea"}`
**Expectation:** `PERMISSION_DENIED` (Relationship check)

### 10. Self-Assigned Role
**Target:** `/users/user-123`
**Attacker:** `user-123`
**Payload:** `{"role": "admin"}` (if roles existed)
**Expectation:** `PERMISSION_DENIED`

### 11. Cross-User Update
**Target:** `/projects/proj-abc`
**Attacker:** `user-456`
**Payload:** `{"name": "Hacked Name"}`
**Expectation:** `PERMISSION_DENIED`

### 12. Deletion of Others' Data
**Target:** `/goals/goal-abc`
**Attacker:** `user-456`
**Action:** `delete`
**Expectation:** `PERMISSION_DENIED`
