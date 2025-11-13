# 🗄️ Database Schema Updates

## Overview
Comprehensive database schema updates and form enhancements for Contacts, Deals, and Companies.

---

## ✅ **COMPLETED**

### **1. Database Migrations Created**

#### **📧 Contacts Table** (`20251112_update_contacts_schema.sql`)
**New Fields:**
- `owner_id` - Contact owner (user reference)
- `primary_email` - Primary email address
- `secondary_email` - Secondary email address
- `primary_phone` - Primary phone number
- `secondary_phone` - Secondary phone number
- `instagram_url` - Instagram profile
- `facebook_url` - Facebook profile
- `website_url` - Personal website
- `tiktok_url` - TikTok profile
- `x_url` - X (Twitter) profile
- `linkedin_url` - LinkedIn profile
- `address` - Street address
- `zip_code` - ZIP/postal code
- `last_contacted_at` - Last contact timestamp

**Indexes Created:**
- `idx_contacts_owner_id`
- `idx_contacts_primary_email`
- `idx_contacts_company_id`
- `idx_contacts_last_contacted`

---

#### **💼 Deals Table** (`20251112_update_deals_schema.sql`)
**New Fields:**
- `deal_owner_id` - Deal owner (user reference)
- `setter_id` - User who set the appointment
- `account_manager_id` - Account manager
- `industry` - Industry/vertical
- `description` - Deal description
- `timezone` - Client timezone
- `annual_revenue` - Client's annual revenue
- `currency` - Deal currency (USD, EUR, etc.)
- `product_segment` - Product/service segment
- `lead_source` - Lead source
- `referral_source` - Specific referral source
- `last_activity_date` - Last activity timestamp

**Indexes Created:**
- `idx_deals_deal_owner`
- `idx_deals_setter`
- `idx_deals_account_manager`
- `idx_deals_pipeline`
- `idx_deals_industry`
- `idx_deals_last_activity`
- `idx_deals_lead_source`

---

#### **🏢 Companies Table** (`20251112_update_companies_schema.sql`)
**New Fields:**
- `domain` - Company domain (e.g., example.com)
- `website` - Full website URL
- `phone` - Company phone
- `industry` - Industry/sector
- `description` - Company description
- `founder_full_name` - Founder's name
- `founder_email` - Founder's email
- `instagram_url` - Company Instagram
- `facebook_url` - Company Facebook
- `tiktok_url` - Company TikTok
- `linkedin_url` - Company LinkedIn
- `country` - Company country
- `state` - Company state/region
- `city` - Company city
- `address` - Physical address

**Indexes Created:**
- `idx_companies_domain`
- `idx_companies_industry`
- `idx_companies_country`

---

### **2. Contact Form Updated** ✅

**New UI Sections:**
1. **Contact Owner** - Dropdown to assign owner
2. **Contact Information** - First name, last name (unchanged)
3. **Email Addresses** - Primary & Secondary
4. **Phone Numbers** - Primary & Secondary
5. **Social Media & Website** - 6 social/web URLs (Instagram, Facebook, Website, TikTok, X, LinkedIn)
6. **Description** - Bio/notes textarea
7. **Timezone** - Timezone selector
8. **Address** - Street, City, State, ZIP, Country
9. **Company** - Company dropdown
10. **Lifecycle Stage** - Lead, Prospect, etc.

**Form Features:**
- ✅ Fully responsive (mobile-optimized)
- ✅ Section headers for organization
- ✅ URL validation for social media fields
- ✅ User/owner fetching from profiles
- ✅ Scrollable dialog for long forms

---

## 🚧 **IN PROGRESS / TO DO**

### **3. Deal Form Updates** (TODO)
**Fields to Add:**
- Deal Owner (dropdown)
- Setter (dropdown)
- Account Manager (dropdown)
- Industry (text/dropdown)
- Annual Revenue (number)
- Product Segment (text)
- Currency (dropdown: USD, EUR, etc.)
- Lead Source (dropdown)
- Referral Source (text)
- Last Activity Date (auto-updated)

### **4. Company Form Updates** (TODO)
**Fields to Add:**
- Company Domain
- Company Website
- Company Phone
- Industry
- Description (textarea)
- Founder Full Name
- Founder Email
- Social Media URLs (Instagram, Facebook, TikTok, LinkedIn)
- Address Fields (Country, State, City, Address)

---

## 📋 **Field Comparison**

### **Contacts**
| Old Field | New Field | Status |
|-----------|-----------|--------|
| `email` | `primary_email` | ✅ Migrated |
| `phone` | `primary_phone` | ✅ Migrated |
| - | `secondary_email` | ✅ Added |
| - | `secondary_phone` | ✅ Added |
| - | 6 social URLs | ✅ Added |
| - | `address` | ✅ Added |
| - | `zip_code` | ✅ Added |
| `owner_id` | `owner_id` | ✅ Exists |

### **Deals**
| Old Field | New Field | Status |
|-----------|-----------|--------|
| `owner_id` | `deal_owner_id` | ✅ Migrated |
| - | `setter_id` | ✅ Added |
| - | `account_manager_id` | ✅ Added |
| - | `industry` | ✅ Added |
| - | `annual_revenue` | ✅ Added |
| - | `currency` | ✅ Added |
| - | `product_segment` | ✅ Added |
| - | `lead_source` | ✅ Added |
| - | `referral_source` | ✅ Added |
| - | `last_activity_date` | ✅ Added |

### **Companies**
| Old Field | New Field | Status |
|-----------|-----------|--------|
| `name` | `name` | ✅ Exists |
| - | `domain` | ✅ Added |
| - | `website` | ✅ Added |
| - | `industry` | ✅ Added |
| - | `founder_full_name` | ✅ Added |
| - | `founder_email` | ✅ Added |
| - | 4 social URLs | ✅ Added |
| - | Location fields | ✅ Added |

---

## 🎯 **Next Steps**

1. **Update Deal Form** - Add all new fields with proper UI
2. **Create/Update Company Form** - Add all new fields
3. **Update TypeScript Types** - Regenerate types from database
4. **Test All Forms** - Ensure data saves correctly
5. **Update Display Components** - Show new fields in detail views

---

## 📦 **Files Created/Modified**

### **Migrations:**
- `supabase/migrations/20251112_update_contacts_schema.sql`
- `supabase/migrations/20251112_update_deals_schema.sql`
- `supabase/migrations/20251112_update_companies_schema.sql`

### **Forms:**
- `src/components/contacts/ContactForm.tsx` ✅ Updated
- `src/components/deals/DealForm.tsx` 🚧 TODO
- `src/components/companies/CompanyForm.tsx` 🚧 TODO (or create)

---

**Status:** 4/6 Complete  
**Last Updated:** November 12, 2025

