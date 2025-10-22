# Quick Reference Guide

## 📁 Documentation Location
All documentation files are now in `/documentation` folder

## 🗓️ Latest Updates

### January 22, 2025
- **Group Chat Fixes & EOD UI Improvements**
  - File: `2025-01-22_Group_Chat_Fixes_And_EOD_UI_Improvements.md`
  - Fixed group chat messaging for admin and EOD users
  - Redesigned EOD messaging UI with modern design
  - Organized documentation into dedicated folder

### Previous Updates
- Login page redesign (removed sign-up)
- Messaging unified view (single tab for all conversations)
- EOD Admin dashboard fixes
- Role-based access control
- Bulk upload improvements
- Deal stage tracking fixes

## 🔍 Finding Documentation

### By Feature:
- **EOD Portal:** Look for files starting with `EOD_`
- **Messaging:** Look for files with `MESSAGING_` or `GROUP_CHAT_`
- **Login/Auth:** Look for `LOGIN_`, `ROLE_`, or `AUTH_`
- **Bulk Upload:** Look for `BULK_UPLOAD_`
- **Dialpad:** Look for `DIALPAD_`
- **Admin:** Look for `ADMIN_` or `EOD_ADMIN_`

### By Date:
All new documentation follows format: `YYYY-MM-DD_Feature_Name.md`

## 🚀 Quick Commands

### Run Development Server:
```bash
npm run dev
```

### Run Supabase Locally:
```bash
supabase start
```

### Apply Migration:
```bash
supabase migration up
```

### Check Linting:
```bash
npm run lint
```

## 📊 Project Structure

```
dealdashai/
├── documentation/          # All MD files (58 files)
├── src/
│   ├── components/
│   │   ├── eod/           # EOD-specific components
│   │   ├── calls/         # Call-related components
│   │   ├── pipeline/      # Deal pipeline components
│   │   └── ...
│   ├── pages/             # Main pages
│   └── ...
├── supabase/
│   ├── migrations/        # Database migrations
│   └── functions/         # Edge functions
└── README.md              # Main readme (kept in root)
```

## 🔑 Key Files

### Authentication:
- `src/pages/Login.tsx` - Unified login page
- `src/components/auth/ProtectedRoute.tsx` - Route protection

### Messaging:
- `src/pages/Messages.tsx` - Admin messaging
- `src/components/eod/EODMessaging.tsx` - EOD user messaging

### EOD Portal:
- `src/pages/EODPortal.tsx` - Main EOD interface
- `src/pages/Admin.tsx` - EOD Admin dashboard

### Database:
- `supabase/migrations/` - All database changes
- Key tables: `user_profiles`, `eod_submissions`, `group_chats`, `messages`

## 🐛 Common Issues

### Group Chat Not Working:
- Check `group_id` vs `group_chat_id` column names
- Verify RLS policies are set correctly
- See: `2025-01-22_Group_Chat_Fixes_And_EOD_UI_Improvements.md`

### EOD Reports Not Showing:
- Check if data is in `eod_submissions` table (not old `eod_reports`)
- Verify user roles in `user_profiles`
- See: `EOD_ADMIN_FINAL_FIX.md`

### Login Issues:
- Verify user exists in `auth.users`
- Check `user_profiles` table for role
- See: `ROLE_BASED_ACCESS_FIX.md`

## 📞 Support

For issues or questions:
1. Check relevant documentation in `/documentation`
2. Review error logs in browser console
3. Check Supabase dashboard for database issues

---

**Last Updated:** January 22, 2025

