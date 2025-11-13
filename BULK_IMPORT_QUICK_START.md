# 🚀 Bulk Import - Quick Start Guide

## ⚡ **TL;DR**

1. Open Deals page
2. Click "Bulk Import" button
3. Upload your Excel file
4. Click "Upload & Import"
5. Done! ✅

---

## 📋 **Minimum Requirements**

Your Excel file **must** have at least:
- **Deal Name** column (for deals)
- **Deal Stage** column (for automatic pipeline assignment)
- **Company Name** OR **Contact First Name/Email** (for associations)

That's it! Everything else is optional.

---

## 🎯 **Stage Names (For Automatic Pipeline Assignment)**

### **Common Stages** (recognized automatically):
```
✅ Not Contacted
✅ No Answer / Gatekeeper
✅ Decision Maker
✅ DM Connected (or just "DM")
✅ Nurturing
✅ Interested
✅ Strategy Call Booked
✅ Strategy Call Attended
✅ Proposal / Scope
✅ Closed Won (or just "Won")
✅ Closed Lost (or just "Lost")
✅ Discovery
✅ Uncontacted (or "New Opt In")
✅ Not Qualified
✅ Not Interested (or "Do Not Call")
```

### **BizOps Stages:**
```
✅ BizOps Audit Agreement Sent
✅ BizOps Audit Paid / Booked
✅ BizOps Audit Attended
✅ MS Agreement Sent
✅ Balance Paid / Deal Won
```

### **Client Stages:**
```
✅ Onboarding Call Booked
✅ Onboarding Call Attended
✅ Active Client (Operator)
✅ Active Client - Project in Progress
✅ Paused Client
✅ Cancelled / Completed
```

**Don't see your stage?** The system will:
1. Show a warning
2. Put the deal in the first available pipeline
3. Still import your data ✅

---

## 📊 **Excel Template**

### **Minimum Columns:**
```
| Deal Name | Deal Stage | Company Name | Contact First Name | Contact Email |
|-----------|------------|--------------|-------------------|---------------|
| Acme Deal | DM Connected | Acme Corp | John | john@acme.com |
```

### **Recommended Columns:**
```
| Company Name | Deal Name | Deal Stage | Revenue | Contact First Name | Contact Last Name | Contact Email | Contact Phone Number |
```

### **All Supported Columns:**
```
COMPANY:
- Company Name
- Company Phone Number
- Company Email

CONTACT:
- Contact First Name
- Contact Last Name
- Contact Email
- Contact Secondary Email
- Contact Phone Number
- Contact Secondary Phone Number
- Contact Website
- Contact LinkedIn
- Contact Instagram
- Contact TikTok
- Contact Facebook

DEAL:
- Deal Name
- Deal Stage (IMPORTANT!)
- Revenue
- Priority (High/Medium/Low)
- Vertical
- Deal Source
- Deal Notes
```

---

## ⚡ **Quick Examples**

### **Example 1: Simple Import**
```
| Company Name | Deal Name | Deal Stage | Contact Email |
|--------------|-----------|-----------|---------------|
| ABC Corp | ABC Deal | Interested | contact@abc.com |
| XYZ Inc | XYZ Deal | Proposal | hello@xyz.com |
```
**Result:** 2 companies, 2 contacts, 2 deals ✅

### **Example 2: With Revenue**
```
| Company Name | Deal Name | Deal Stage | Revenue | Contact Email |
|--------------|-----------|-----------|---------|---------------|
| ABC Corp | ABC Deal | Interested | $5,000 | contact@abc.com |
| XYZ Inc | XYZ Deal | Proposal | 10000 | hello@xyz.com |
```
**Result:** Revenue auto-cleaned: 5000 and 10000 ✅

### **Example 3: Multiple Contacts for Same Company**
```
| Company Name | Deal Name | Deal Stage | Contact First Name | Contact Email |
|--------------|-----------|-----------|-------------------|---------------|
| ABC Corp | ABC Deal 1 | Interested | John | john@abc.com |
| ABC Corp | ABC Deal 2 | Proposal | Jane | jane@abc.com |
```
**Result:** 1 company, 2 contacts, 2 deals ✅

---

## ✅ **What Gets Automatically Handled**

### **1. Empty Cells**
- ✅ Skipped automatically
- ✅ No errors thrown
- ✅ Import continues

### **2. Phone Numbers**
```
Input: (555) 123-4567 → Output: +15551234567
Input: 555-123-4567 → Output: +15551234567
Input: 5551234567 → Output: +15551234567
```

### **3. Revenue/Amount**
```
Input: $1,000.00 → Output: 1000
Input: 5000 → Output: 5000
Input: €2,500 → Output: 2500
Input: "lots" → Output: null (skipped)
```

### **4. Stage Names**
```
Input: "dm" → Mapped to: "dm connected"
Input: "Won" → Mapped to: "closed won"
Input: "DM Connected" → Mapped to: "dm connected"
Input: "Discovery" → Mapped to: "discovery"
```

### **5. Duplicates**
- **Companies:** Matched by name → reused if exists
- **Contacts:** Matched by email → reused if exists
- **Result:** No duplicate companies or contacts! ✅

---

## 🚨 **Common Mistakes**

### ❌ **Missing Deal Stage**
**Problem:** Deals without stage go to first pipeline's first stage
**Solution:** Always include "Deal Stage" column

### ❌ **Wrong Stage Names**
**Problem:** Stage "My Custom Stage" not recognized
**Solution:** Use standard stage names (see list above)

### ❌ **Special Characters in Phone**
**Problem:** Phone "call me!" becomes invalid
**Solution:** Use numbers only: 5551234567

### ❌ **Text in Revenue**
**Problem:** Revenue "5k dollars" becomes null
**Solution:** Use numbers: 5000

---

## 📝 **Step-by-Step Tutorial**

### **Step 1: Prepare Your Excel**
1. Open Excel or Google Sheets
2. Add columns: `Company Name`, `Deal Name`, `Deal Stage`, `Contact Email`
3. Fill in your data
4. Save as `.xlsx`

### **Step 2: Import**
1. Go to Deals page in app
2. Click "Bulk Import" button
3. Click "Choose File"
4. Select your Excel file
5. Click "Upload & Import"

### **Step 3: Wait**
- Progress bar shows status
- Usually takes 5-30 seconds
- Don't close the dialog!

### **Step 4: Review Results**
- Check success counts
- Review any warnings
- Note skipped rows (if any)
- Page auto-reloads after 2 seconds

### **Step 5: Verify**
- Go to your pipelines
- Check deals are in correct stages
- Verify contact information
- ✅ Done!

---

## 💡 **Pro Tips**

1. **Test First:** Import 5 rows first to verify format
2. **Clean Data:** Remove extra spaces and formatting
3. **Consistent Names:** Use same company names for grouping
4. **Valid Emails:** Check email format before import
5. **Standard Stages:** Use the stage names list above

---

## 🎉 **You're Ready!**

The system will:
- ✅ Auto-assign deals to correct pipelines
- ✅ Skip null/empty values
- ✅ Format phone numbers
- ✅ Clean revenue amounts
- ✅ Prevent duplicates
- ✅ Show detailed results

**Just upload your Excel and let the system do the work!** 🚀

---

**Questions?** Check the full documentation: `BULK_IMPORT_IMPROVEMENTS.md`

