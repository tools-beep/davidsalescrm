# Advanced Filters - Location and Timezone Update

## Date: November 19, 2025

## Updates Made

Added **4 new filter options** to the Advanced Filtering sidebar:
- ✅ **Timezone**
- ✅ **Country**
- ✅ **State/Region**
- ✅ **City**

---

## Files Modified

### 1. **AdvancedFiltersSidebar.tsx**
**Path:** `/src/components/pipeline/AdvancedFiltersSidebar.tsx`

**Changes:**
- Added new props to interface: `timezones`, `cities`, `states`, `countries`
- Added UI sections for each new filter with badge-based selection
- Each section shows scrollable list of available options
- Clicking a badge toggles the filter on/off
- Active filters are highlighted with primary color

**UI Sections Added:**
```typescript
// Timezone Filter (after Currency)
<div className="space-y-3">
  <Label className="text-sm font-semibold">Timezone</Label>
  <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto">
    {timezones.map((timezone) => (
      <Badge ... onClick={() => toggleArrayFilter('timezones', timezone)}>
        {timezone}
      </Badge>
    ))}
  </div>
</div>

// Country Filter
<div className="space-y-3">
  <Label className="text-sm font-semibold">Country</Label>
  ...
</div>

// State/Region Filter
<div className="space-y-3">
  <Label className="text-sm font-semibold">State/Region</Label>
  ...
</div>

// City Filter
<div className="space-y-3">
  <Label className="text-sm font-semibold">City</Label>
  ...
</div>
```

---

### 2. **Deals.tsx**
**Path:** `/src/pages/Deals.tsx`

**Changes:**

#### A. **Extract Unique Values**
Added logic to extract unique values from deals data:
```typescript
timezones={[...new Set(deals.map(d => d.timezone).filter(Boolean))]}
cities={[...new Set(deals.map(d => d.city).filter(Boolean))]}
states={[...new Set(deals.map(d => d.state).filter(Boolean))]}
countries={[...new Set(deals.map(d => d.country).filter(Boolean))]}
```

#### B. **Added Timezone Filtering Logic**
Added timezone filter to the `filteredDeals` useMemo:
```typescript
if (filters.timezones.length > 0 && !filters.timezones.includes(deal.timezone)) {
  return false;
}
```

Note: City, State, and Country filtering logic was already present!

#### C. **Updated Filter Count Badge**
Updated the active filters count to include all filters:
```typescript
{[filters.stages, filters.priorities, filters.companies, filters.dealOwners, 
  filters.accountManagers, filters.setters, filters.currencies, filters.timezones,
  filters.verticals, filters.dealSources, filters.annualRevenue, filters.productSegments,
  filters.cities, filters.states, filters.countries].reduce((acc, arr) => acc + arr.length, 0)}
```

---

## How It Works

### 1. **Data Extraction**
When deals are loaded, the system:
- Extracts all unique timezones from deals
- Extracts all unique cities from deals
- Extracts all unique states from deals
- Extracts all unique countries from deals
- Removes null/undefined values using `.filter(Boolean)`
- Passes these as arrays to the sidebar

### 2. **User Interaction**
When a user clicks "Advanced Filters":
- Sidebar opens from the right
- Scrolls down to see the new filter sections
- Clicks timezone/city/state/country badges to filter
- Multiple selections allowed (OR logic within each filter type)
- Active filters highlighted in primary color

### 3. **Filtering Logic**
When filters are applied:
- Deals page filters in real-time
- Total deal count updates automatically
- Only deals matching ALL selected filters are shown
- Empty filter = no filtering for that category

### 4. **Filter Combinations**
All filters work together with AND logic:
- **Example:** If you select:
  - Timezone: "America/New_York"
  - Country: "USA"
  - State: "California"
  
  **Result:** Only deals that have ALL three attributes

---

## UI Features

### **Timezone Section**
- Shows all unique timezones from deals
- Format: `America/New_York`, `Europe/London`, etc.
- Scrollable list (max height: 48px)
- Badge-based selection

### **Country Section**
- Shows all unique countries from deals
- Scrollable list
- Click to toggle selection

### **State/Region Section**
- Shows all unique states/regions from deals
- Useful for US states or international regions
- Scrollable list

### **City Section**
- Shows all unique cities from deals
- Scrollable list
- Good for targeting specific locations

---

## Benefits

✅ **Better Deal Segmentation**
- Filter deals by geographical location
- Filter by timezone for better call scheduling
- Target specific markets or regions

✅ **Improved User Experience**
- Visual badge-based interface
- Real-time filtering
- Clear active filter indicators
- Easy to add/remove filters

✅ **Data-Driven**
- Only shows options that exist in your data
- No empty filter results
- Automatically updates as new deals are added

✅ **Performance**
- Filters computed once on data load
- Real-time filtering using useMemo
- Smooth user experience

---

## Testing

### Test Location Filters:
1. Go to Deals page
2. Click "Advanced Filters" button
3. Scroll down to see the new sections:
   - Timezone (after Currency)
   - Country
   - State/Region
   - City
4. Click on any badge to filter
5. Verify deal count updates
6. Test multiple selections
7. Clear filters and verify reset

### Test Data:
- Make sure some deals have timezone/city/state/country data
- If filters are empty, upload deals with location data via bulk upload
- Check that filtering works correctly

---

## Notes

- **Existing filters preserved:** All previous filters (Stage, Priority, Amount, Date, Owner, etc.) continue to work
- **Filter state persists:** Filters remain active until cleared or page refresh
- **Responsive design:** Sidebar works on mobile and desktop
- **Scrollable lists:** Long lists automatically scroll (max-height: 48px)
- **Sort order:** Values appear in the order they're found in the data

---

## Future Enhancements (Optional)

- **Search within filters:** Add search box for long lists
- **Sort options:** Alphabetically sort timezone/city/state/country
- **Group by region:** Group timezones by region (Americas, Europe, Asia)
- **Recently used:** Show recently used filter values at the top
- **Saved filters:** Save filter combinations as presets

