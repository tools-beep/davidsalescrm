# ✅ ACCOUNT MANAGER ANALYTICS - REAL DATA INTEGRATION

## What Was Fixed

The Account Manager Analytics page was showing 0 meetings because it was fetching from the old `calls` table with `is_account_manager_meeting = true`, but Account Manager meetings are now stored in the separate `meetings` table.

## Changes Made

### Updated `fetchMeetings` Function

**Before:**
```typescript
// Fetching from 'calls' table
let query = supabase
  .from('calls')
  .select(`...`)
  .eq('is_account_manager_meeting', true)
  .not('meeting_type', 'is', null)
  .order('call_timestamp', { ascending: false });
```

**After:**
```typescript
// Fetching from 'meetings' table
let query = supabase
  .from('meetings')
  .select(`
    id,
    meeting_type,
    meeting_outcome,
    meeting_timestamp,
    duration_seconds,
    account_manager_id,
    user_profiles:account_manager_id (
      first_name,
      last_name
    )
  `)
  .order('meeting_timestamp', { ascending: false });
```

### Key Changes:

1. **Table:** `calls` → `meetings`
2. **Timestamp field:** `call_timestamp` → `meeting_timestamp`
3. **User ID field:** `rep_id` → `account_manager_id`
4. **Join:** `user_profiles:rep_id` → `user_profiles:account_manager_id`
5. **Removed filters:** No need for `is_account_manager_meeting` or `meeting_type IS NOT NULL`

### Data Transformation

Added transformation to maintain compatibility with existing interface:

```typescript
const transformedData = (data || []).map((meeting: any) => ({
  id: meeting.id,
  meeting_type: meeting.meeting_type,
  meeting_outcome: meeting.meeting_outcome,
  call_timestamp: meeting.meeting_timestamp, // Map for compatibility
  duration_seconds: meeting.duration_seconds,
  rep_id: meeting.account_manager_id, // Map for compatibility
  user_profiles: meeting.user_profiles
}));
```

## Analytics Metrics Now Showing

### 1. Total Meetings Card
- **Count:** Total number of meetings logged
- **Avg Duration:** Average meeting duration in minutes/seconds
- **Icon:** 📅 Calendar

### 2. At Risk Card
- **Count:** Meetings with outcomes:
  - "Client - Risk Churn"
  - "Operator - At Risk"
- **Color:** Red (destructive)
- **Icon:** ⚠️ Alert Circle

### 3. Opportunities Card
- **Count:** Meetings with outcomes:
  - "Client - Upsell Opportunity"
  - "Client - Referral Opportunity"
- **Color:** Green
- **Icon:** 📈 Trending Up

### 4. Account Managers Card
- **Count:** Number of unique Account Managers who logged meetings
- **Description:** "Active this period"
- **Icon:** 👥 Users

## Additional Analytics Sections

### Meeting Types Distribution
Shows bar chart of meeting types:
- Client Check-In
- Client Strategy Session
- Client Resolution Meeting
- Campaign Alignment (Client + Operator)
- Referral Request Meeting
- Upsell/Downsell Conversation
- Operator Leadership Meeting
- Operator Resolution Meeting
- Internal Performance Alignment

### Meeting Outcomes
Grid view of all outcomes with counts:
- **Red badges:** Risk-related outcomes
- **Blue badges:** Opportunity-related outcomes
- **Gray badges:** Neutral outcomes

### Account Manager Performance
List of Account Managers showing:
- Name
- Total meetings count
- Number of "At Risk" situations (red badge)
- Number of "Opportunities" (blue badge)
- "All Good" badge if no risks/opportunities

## Date Filtering

The component supports date filtering via the `dateFilter` prop:
- `"all"` - All time
- `"7"` - Last 7 days
- `"30"` - Last 30 days
- `"90"` - Last 90 days

Example:
```typescript
<AccountManagerAnalytics dateFilter="30" />
```

## Testing

1. **Navigate to the Account Manager Analytics page**
2. **Expected Results:**
   - ✅ "Total Meetings" shows 1 (the meeting you logged)
   - ✅ "At Risk" shows 0 or 1 (depending on outcome)
   - ✅ "Opportunities" shows 0 or 1 (depending on outcome)
   - ✅ "Account Managers" shows 1 (Hannah)
   - ✅ "Meeting Types Distribution" shows "Client Check-In: 1"
   - ✅ "Meeting Outcomes" shows "Operator - Aligned: 1"
   - ✅ "Account Manager Performance" shows Hannah with 1 meeting

## Sample Data

To test with more data, you can insert sample meetings:

```sql
INSERT INTO meetings (
  account_manager_id,
  meeting_type,
  meeting_outcome,
  duration_seconds,
  notes,
  meeting_timestamp
) VALUES
  (
    (SELECT user_id FROM user_profiles WHERE email = 'hannah@stafflyhq.ai'),
    'Client Check-In',
    'Client - Positive',
    600,
    'Great conversation about Q4 goals',
    NOW() - INTERVAL '2 days'
  ),
  (
    (SELECT user_id FROM user_profiles WHERE email = 'hannah@stafflyhq.ai'),
    'Client Strategy Session',
    'Client - Upsell Opportunity',
    1200,
    'Client interested in additional services',
    NOW() - INTERVAL '5 days'
  ),
  (
    (SELECT user_id FROM user_profiles WHERE email = 'hannah@stafflyhq.ai'),
    'Operator Leadership Meeting',
    'Operator - Aligned',
    900,
    'Reviewed performance metrics',
    NOW() - INTERVAL '1 day'
  );
```

After inserting, the analytics should show:
- **Total Meetings:** 4
- **At Risk:** 0
- **Opportunities:** 1
- **Account Managers:** 1

## Files Changed

1. **AccountManagerAnalytics.tsx** - Updated to fetch from `meetings` table

## Benefits

✅ **Real Data** - Shows actual meetings from database
✅ **Accurate Metrics** - Calculates real statistics
✅ **Performance Tracking** - Per-manager breakdown
✅ **Risk Identification** - Highlights clients/operators at risk
✅ **Opportunity Detection** - Shows upsell/referral potential
✅ **Date Filtering** - Can filter by time period

## Future Enhancements

### 1. Trend Charts
Add line charts showing meetings over time:
```typescript
// Group by date
const dailyMeetings = meetings.reduce((acc, m) => {
  const date = format(new Date(m.call_timestamp), 'yyyy-MM-dd');
  acc[date] = (acc[date] || 0) + 1;
  return acc;
}, {});
```

### 2. Export to CSV
Add export functionality for reporting:
```typescript
const exportToCSV = () => {
  const csv = meetings.map(m => 
    `${m.meeting_type},${m.meeting_outcome},${m.call_timestamp}`
  ).join('\n');
  // Download CSV
};
```

### 3. Filter by Account Manager
Add dropdown to filter by specific manager:
```typescript
const [selectedManager, setSelectedManager] = useState<string | null>(null);
```

### 4. Meeting Notes Search
Add ability to search through meeting notes:
```typescript
const [searchTerm, setSearchTerm] = useState('');
const filteredMeetings = meetings.filter(m => 
  m.notes?.toLowerCase().includes(searchTerm.toLowerCase())
);
```

## Result

✅ **Account Manager Analytics now shows real data from the meetings table!**
✅ **All metrics calculated from actual meetings**
✅ **Performance tracking per Account Manager**
✅ **Risk and opportunity identification working**

