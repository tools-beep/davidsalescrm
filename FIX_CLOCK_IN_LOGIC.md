# 🚨 CRITICAL BUG: Clock-In Logic Inconsistency

## 🔍 ROOT CAUSE

**The system has TWO conflicting clock-in models:**

### Model 1: Global Clock-In (What the code does)
- `handleClockIn()` checks: "Is user clocked in TODAY?" (any client)
- If YES → Block clock-in with "Already clocked in"
- **Problem:** User can't clock in for a different client!

### Model 2: Per-Client Clock-In (What the database supports)
- Database has `client_name` column
- `handleClockInSubmit()` inserts with `client_name: selectedClient`
- **Problem:** Code doesn't check per-client, only global!

## 🐛 THE BUG

**Scenario:**
1. User clocks in for "Client A" → Creates record with `client_name: "Client A"`
2. User switches to "Client B" tab
3. User tries to clock in for "Client B"
4. **BUG:** System says "Already clocked in" because it found the "Client A" record!

**Expected:** User should be able to clock in for multiple clients per day.

## ✅ THE FIX

We need to decide: **Global or Per-Client?**

### Option A: Global Clock-In (Recommended)
- User clocks in ONCE per day (not per client)
- All clients share the same clock-in session
- Simpler, cleaner logic

### Option B: Per-Client Clock-In
- User can clock in separately for each client
- More complex, but more flexible
- Need to update ALL clock-in logic

**I recommend Option A (Global) because:**
- Matches the UI flow (one "Clock In" button)
- Simpler to understand for users
- Easier to calculate metrics (one shift per day)
- The `client_name` field can be removed or made nullable

## 🔧 IMPLEMENTATION (Option A - Global)

Remove `client_name` from clock-in logic entirely.

