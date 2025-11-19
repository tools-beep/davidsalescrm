# Bulk Upload Format Documentation

## Overview
The bulk upload feature supports a comprehensive format with color-coded columns to organize data into three main sections: Company, Deal, and Contact information.

---

## 📋 **Supported Column Names**

### **Company Columns** (Grey Color)
These columns should be highlighted in **grey** in your Excel file:

1. **Company Name** - Name of the company (required if creating companies)
2. **Company Phone Number** - Main phone number for the company
3. **Company Email** - Main email address for the company
4. **Time Zone** - Company timezone (e.g., America/New_York)
5. **Address** - Street address
6. **City/Region** - City or region
7. **State/Region** - State or region
8. **ZIP Code** - Postal/ZIP code
9. **Country** - Country name

---

### **Deal Columns** (Green Color)
These columns should be highlighted in **green** in your Excel file:

1. **Deal Source** - Where the deal came from (e.g., referral, cold call, website)
2. **Referral Source** or **Refferal Source** - Who referred this deal
3. **Deal Owner** - Name of the deal owner (stored in notes)
4. **Account Manager** - Name of the account manager (stored in notes)
5. **Currency** - Currency code (e.g., USD, EUR, GBP) - defaults to USD
6. **Revenue** - Expected revenue from the deal (numbers only, $ and commas will be stripped)
7. **Pipeline Name** - Pipeline name (currently auto-assigned based on Deal Stage)
8. **Deal Stage** - Current stage of the deal (see Stage Mapping below)
9. **Deal Name** - Name/description of the deal (required if creating deals)
10. **Time Zone** or **Deal Time Zone** - Deal timezone
11. **Priority** - Deal priority: "High", "Medium", or "Low"
12. **Vertical** - Industry vertical or category
13. **Deal Notes** - General notes about the deal
14. **Call Type** - Type of call/outreach (stored in notes)
15. **Call Outcomes** or **Call Outcome** - Result of the call (stored in notes)
16. **Legal Business Name** - Legal business name (stored in notes)
17. **Billing Address** - Billing address (stored in notes)
18. **Deal City/Region** or **Deal City** - Deal city
19. **Deal State/Region** or **Deal State** - Deal state
20. **Deal ZIP Code** or **Deal Zipcode** - Deal ZIP code
21. **Deal Country** - Deal country

---

### **Contact Columns** (Black Color)
These columns should be highlighted in **black** in your Excel file:

1. **Client's Full Name** - Full name (will be split into first/last)
2. **Contact Owner** - Name of contact owner
3. **Contact First Name** or **Contract First Name** - Contact's first name (required)
4. **Contact Last Name** or **Contract Last Name** - Contact's last name (required)
5. **Contact Primary Email** or **Contract Primary Email** - Primary email address
6. **Contact Secondary Email** - Secondary email address
7. **Primary Phone Number** - Primary phone number (main phone field)
8. **Secondary Phone Number** - Secondary phone number
9. **Contact Mobile** or **Mobile** - Mobile phone number
10. **Contact Time Zone** - Contact's timezone

**Note:** For phone numbers, the system now recognizes:
- "Primary Phone Number" (preferred)
- "Contact Phone Number" (legacy support)
- "Contact Phone" (legacy support)

---

## 🎯 **Deal Stage Mapping**

The system will automatically assign deals to the correct pipeline based on the **Deal Stage** value.

### **Common Stages:**
- Not Contacted
- No Answer / Gatekeeper
- Decision Maker / DM Connected
- Nurturing
- Interested
- Strategy Call Booked
- Strategy Call Attended
- Proposal / Scope
- Closed Won / Won
- Closed Lost / Lost
- Discovery
- Uncontacted / New Opt In
- Not Qualified
- Not Interested / Do Not Call

### **BizOps Stages:**
- BizOps Audit Agreement Sent
- BizOps Audit Paid / Booked
- BizOps Audit Attended
- MS Agreement Sent
- Balance Paid / Deal Won

### **Client Stages:**
- Onboarding Call Booked
- Onboarding Call Attended
- Active Client (Operator)
- Active Client - Project in Progress
- Paused Client
- Cancelled / Completed

---

## 💡 **Important Notes**

### **Auto-Pipeline Assignment**
Deals are **automatically assigned to the correct pipeline** based on their stage. You don't need to specify a pipeline name - the system will:
1. Normalize the stage name you provide
2. Find which pipeline contains that stage
3. Assign the deal to that pipeline

### **Fields Stored in Notes**
Some fields that don't have direct database columns will be automatically appended to the Deal Notes:
- Deal Owner
- Account Manager
- Call Type
- Call Outcomes
- Legal Business Name
- Billing Address
- Deal ZIP Code (separate from company ZIP)

### **Phone Number Format**
Phone numbers are automatically formatted. You can provide them in any format:
- (555) 123-4567
- 555-123-4567
- 5551234567
- +1 555-123-4567

### **Duplicate Detection**
The system prevents duplicates by checking:
- **Companies**: By name (case-insensitive)
- **Contacts**: By email, or by first name + last name + phone
- **Deals**: No duplicate checking (allows multiple deals with same name)

---

## 📊 **Example Excel Structure**

| Company Name | Company Phone | Company Email | Deal Name | Deal Stage | Revenue | Priority | Contact First Name | Contact Last Name | Primary Phone Number | Contact Primary Email |
|-------------|---------------|---------------|-----------|------------|---------|----------|-------------------|-------------------|---------------------|----------------------|
| Acme Corp | (555) 123-4567 | info@acme.com | Acme Deal | DM Connected | 50000 | High | John | Doe | (555) 987-6543 | john@acme.com |
| Tech Co | (555) 234-5678 | hello@tech.co | Tech Deal | Interested | 25000 | Medium | Jane | Smith | (555) 876-5432 | jane@tech.co |

---

## ✅ **Minimum Requirements**

Your Excel file **must** have at least:
- **Deal Name** column (for deals)
- **Deal Stage** column (for automatic pipeline assignment)
- **Company Name** OR **Contact First Name/Email** (for associations)

Everything else is optional but recommended for complete data import.

---

## 🚀 **Usage**

1. Prepare your Excel file with the column names listed above
2. Navigate to Deals page
3. Click "Bulk Import" button
4. Select your Excel file
5. Click "Upload & Import"
6. The system will:
   - Detect the header row automatically
   - Create companies, contacts, and deals
   - Link them together
   - Assign deals to correct pipelines
7. Review the import results
8. Page will auto-refresh to show imported data

---

## 🐛 **Troubleshooting**

### **Stage Not Found Warning**
If you see: `"Your Stage Name" → not found in any pipeline`
- The system will still import your data
- The deal will be assigned to the first available pipeline
- It will use that pipeline's first stage
- Solution: Check your stage names against the list above

### **Rows Skipped**
Rows are skipped if:
- No essential data (deal name, company name, or contact info)
- No valid pipeline found for the deal

### **Import Fails**
If the entire import fails:
- Check your Excel file format (must be .xlsx)
- Ensure at least one column header matches our format
- Check for special characters in data
- Try with a smaller file first (< 1000 rows)
