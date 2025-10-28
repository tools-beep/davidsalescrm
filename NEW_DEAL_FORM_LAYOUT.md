# Create New Deal - Form Layout

## Visual Guide

```
┌─────────────────────────────────────────────────────────────┐
│                     Create New Deal                         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Deal Name                                                  │
│  ┌───────────────────────────────────────────────────────┐ │
│  │ Enter deal name                                       │ │
│  └───────────────────────────────────────────────────────┘ │
│                                                             │
│  Description                                                │
│  ┌───────────────────────────────────────────────────────┐ │
│  │ Enter deal description                                │ │
│  │                                                       │ │
│  └───────────────────────────────────────────────────────┘ │
│                                                             │
│  Time Zone                      Vertical                    │
│  ┌─────────────────────────┐   ┌─────────────────────────┐ │
│  │ e.g., America/Los_Ang.. │   │ Select vertical       ▼ │ │
│  └─────────────────────────┘   └─────────────────────────┘ │
│                                                             │
│  Amount                                                     │
│  ┌───────────────────────────────────────────────────────┐ │
│  │ 0.00                                                  │ │
│  └───────────────────────────────────────────────────────┘ │
│                                                             │
│  Pipeline ⭐ NEW!              Stage ⭐ NEW!                 │
│  ┌─────────────────────────┐   ┌─────────────────────────┐ │
│  │ Select pipeline       ▼ │   │ Select pipeline first ▼ │ │
│  └─────────────────────────┘   └─────────────────────────┘ │
│                                                             │
│  Priority                       Close Date                  │
│  ┌─────────────────────────┐   ┌─────────────────────────┐ │
│  │ Medium                ▼ │   │ Pick a date          📅 │ │
│  └─────────────────────────┘   └─────────────────────────┘ │
│                                                             │
│  Company                        Primary Contact             │
│  ┌─────────────────────────┐   ┌─────────────────────────┐ │
│  │ Select company        ▼ │   │ Select contact        ▼ │ │
│  └─────────────────────────┘   └─────────────────────────┘ │
│                                                             │
│                                    ┌────────┐  ┌──────────┐│
│                                    │ Cancel │  │Create Deal││
│                                    └────────┘  └──────────┘│
└─────────────────────────────────────────────────────────────┘
```

## User Flow

### Step 1: Select Pipeline
```
Pipeline Dropdown:
├── Outbound Pipeline
├── Inbound Pipeline
├── Client Success Pipeline
└── [Any other pipelines you've created]
```

### Step 2: Select Stage (Dynamic)

**Example: If "Outbound Pipeline" is selected**
```
Stage Dropdown:
├── Not Contacted
├── No Answer / Gatekeeper
├── Decision Maker
├── Nurturing
├── Interested
├── Strategy Call Booked
├── Strategy Call Attended
├── Proposal / Scope
├── Closed Won
└── Closed Lost
```

**Example: If "Client Success Pipeline" is selected**
```
Stage Dropdown:
├── Onboarding
├── Active Client
├── At Risk
├── Renewal Due
└── [Other client success stages]
```

### Step 3: Complete Other Fields
- Priority (Low/Medium/High)
- Close Date (Calendar picker)
- Company (Optional)
- Primary Contact (Optional)

## Key Features

### 🎯 Smart Stage Selection
- Stage dropdown is **disabled** until you select a pipeline
- Placeholder changes to "Select pipeline first" when disabled
- Automatically shows only stages from the selected pipeline

### 🔄 Auto-Reset
- If you change the pipeline, the stage selection resets
- Prevents invalid stage/pipeline combinations

### 📝 Stage Formatting
- Database stages (e.g., "not-contacted") 
- Display as: "Not Contacted"
- Automatic capitalization and formatting

### ✅ Validation
- Pipeline is **required**
- Stage is **required**
- Deal Name is **required**
- Priority is **required** (defaults to "Medium")

## Before vs After

### ❌ Before (Old Form)
```
- No pipeline selection
- Fixed list of stages (only Outbound stages)
- Deals could end up in wrong pipeline
- Stage mismatches caused errors
```

### ✅ After (New Form)
```
- Pipeline dropdown (required)
- Dynamic stages per pipeline
- Deals always in correct pipeline
- No more stage mismatch errors
```

## Example Usage

### Creating an Outbound Deal
1. Deal Name: "ABC Corp - Sales Opportunity"
2. Pipeline: "Outbound Pipeline"
3. Stage: "Not Contacted"
4. Priority: "High"
5. Amount: "50000"
6. Close Date: "2025-12-31"

### Creating a Client Success Deal
1. Deal Name: "XYZ Inc - Renewal"
2. Pipeline: "Client Success Pipeline"
3. Stage: "Renewal Due"
4. Priority: "High"
5. Amount: "25000"
6. Close Date: "2025-11-30"

## Benefits

✅ **Organized** - Deals go to the right pipeline  
✅ **Flexible** - Works with any pipeline you create  
✅ **Error-Free** - No more stage mismatches  
✅ **Intuitive** - Clear workflow from pipeline → stage  
✅ **Scalable** - Add new pipelines anytime  

---

**Ready to use!** 🚀

