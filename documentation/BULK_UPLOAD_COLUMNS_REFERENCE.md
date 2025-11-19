# Bulk Upload - Exact Column Names Reference

## Quick Copy-Paste Column Headers

This document provides the **exact column names** you should use in your Excel file for bulk upload. Simply copy and paste these into your Excel header row.

---

## 📋 **Company Columns**

Copy these exact names:

```
Company Name
Company Phone Number
Company Email
Time Zone
Address
City/Region
State/Region
ZIP Code
Country
```

---

## 📋 **Deal Columns**

Copy these exact names:

```
Deal Source
Referral Source
Deal Owner
Account Manager
Currency
Revenue
Pipeline Name
Deal Stage
Deal Name
Time Zone
Priority
Vertical
Deal Notes
Call Type
Call Outcomes
Legal Business Name
Billing Address
City/Region
State/Region
ZIP Code
Country
```

**Note:** For deal location fields, you can prefix them with "Deal" to distinguish from company location:
- Deal City/Region
- Deal State/Region
- Deal ZIP Code
- Deal Country

---

## 📋 **Contact Columns**

Copy these exact names:

```
Client's Full Name
Contact Owner
Contact First Name
Contact Last Name
Contact Primary Email
Contact Secondary Email
Primary Phone Number
Secondary Phone Number
Time Zone
```

**Important:** The system will also accept these variations for Contact columns (typo support):
- "Contract First Name" → recognized as "Contact First Name"
- "Contract Last Name" → recognized as "Contact Last Name"
- "Contract Primary Email" → recognized as "Contact Primary Email"

---

## 📊 **Complete Excel Template Header Row**

Here's a complete header row you can copy directly into Excel:

```
Company Name | Company Phone Number | Company Email | Time Zone | Address | City/Region | State/Region | ZIP Code | Country | Deal Source | Referral Source | Deal Owner | Account Manager | Currency | Revenue | Pipeline Name | Deal Stage | Deal Name | Priority | Vertical | Deal Notes | Call Type | Call Outcomes | Legal Business Name | Billing Address | Client's Full Name | Contact Owner | Contact First Name | Contact Last Name | Contact Primary Email | Contact Secondary Email | Primary Phone Number | Secondary Phone Number
```

---

## ✅ **Minimal Setup (Required Columns Only)**

If you want the absolute minimum, use these columns:

```
Company Name
Deal Name
Deal Stage
Contact First Name
Contact Last Name
Primary Phone Number
Contact Primary Email
```

---

## 💡 **Tips for Best Results**

### 1. **Phone Numbers**
The primary contact phone field is now called **"Primary Phone Number"** (no longer "Contact Phone Number")

### 2. **Deal Location vs Company Location**
- For company address: Use `Address`, `City/Region`, `State/Region`, `ZIP Code`, `Country`
- For deal billing address: Use `Billing Address`, `Deal City/Region`, `Deal State/Region`, `Deal ZIP Code`, `Deal Country`

### 3. **Time Zone**
Can be specified at three levels:
- Company level: `Time Zone` column under Company section
- Deal level: `Time Zone` column under Deal section  
- Contact level: `Time Zone` column under Contact section

### 4. **Fields Stored in Notes**
These fields don't have dedicated database columns, so they're automatically added to Deal Notes:
- Deal Owner (name/text)
- Account Manager (name/text)
- Call Type
- Call Outcomes
- Legal Business Name
- Billing Address
- Deal ZIP Code

### 5. **Currency**
Defaults to "USD" if not specified. Supported: USD, EUR, GBP, CAD, AUD, JPY

---

## 🎯 **Example Data Rows**

### Minimal Example:
| Company Name | Deal Name | Deal Stage | Contact First Name | Contact Last Name | Primary Phone Number | Contact Primary Email |
|-------------|-----------|------------|-------------------|-------------------|---------------------|----------------------|
| Acme Corp | Q1 Deal | Interested | John | Doe | 5551234567 | john@acme.com |

### Full Example:
| Company Name | Company Phone | Company Email | Time Zone | Address | City/Region | State/Region | ZIP Code | Country | Deal Source | Referral Source | Deal Owner | Account Manager | Currency | Revenue | Deal Stage | Deal Name | Priority | Vertical | Contact First Name | Contact Last Name | Primary Phone Number | Contact Primary Email |
|-------------|---------------|---------------|-----------|---------|-------------|--------------|----------|---------|-------------|-----------------|------------|-----------------|----------|---------|------------|-----------|----------|----------|-------------------|-------------------|---------------------|----------------------|
| Acme Corp | 555-123-4567 | info@acme.com | America/New_York | 123 Main St | New York | NY | 10001 | USA | Website | John Smith | Sarah Jones | Mike Wilson | USD | 50000 | Interested | Q1 Enterprise Deal | High | Real Estate | John | Doe | 555-987-6543 | john@acme.com |

---

## 🚨 **Common Mistakes to Avoid**

❌ **DON'T** use "Contact Phone Number"  
✅ **DO** use "Primary Phone Number"

❌ **DON'T** use "Contact Email"  
✅ **DO** use "Contact Primary Email"

❌ **DON'T** mix company and deal location fields  
✅ **DO** use prefixes: `City/Region` for company, `Deal City/Region` for deal billing

❌ **DON'T** leave out Deal Stage if you want proper pipeline assignment  
✅ **DO** always include Deal Stage for automatic pipeline routing

---

## 📞 **Need Help?**

If you're having trouble with the bulk upload:
1. Check that your column names match exactly (copy-paste from above)
2. Ensure at least Deal Name, Deal Stage, and Contact info are provided
3. Review the detailed documentation in `BULK_UPLOAD_FORMAT.md`
4. Check the console for specific error messages

