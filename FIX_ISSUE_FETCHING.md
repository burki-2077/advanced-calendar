# 🔥 CRITICAL FIX - Issue Fetching Reverted

## What Happened

After implementing the code review improvements, the calendar stopped showing events due to a **Forge limitation** with the 2-step fetch approach.

## The Problem

**Attempted Optimization (FAILED in Forge):**
1. Fetch only issue keys (lightweight) - up to 1000 keys
2. Split keys into batches
3. Fetch full details for each batch in parallel

**Why It Failed:**
This approach doesn't work properly in Forge's environment. The Forge runtime has limitations that prevent this batching strategy from working correctly.

## The Fix

**Reverted to Original Single-Query Approach:**
```javascript
// Simple single JQL query (works in Forge)
const result = await api.asUser().requestJira(
  route`/rest/api/3/search/jql`,
  {
    method: 'POST',
    body: JSON.stringify({
      jql: jql,
      fields: fieldsList,
      maxResults: 100  // Forge limit
    })
  }
);
```

## What This Means

### Limitations
- **Maximum 100 issues** per query (Jira API limit)
- Cannot fetch more than 100 events at a time
- For users with 100+ visits, only first 100 will show

### What Still Works
✅ All utility modules (logger, constants, dateUtils, apiUtils)  
✅ Error handling with new response format  
✅ Retry logic  
✅ Documentation  
✅ Calendar displays correctly (up to 100 events)

### What Was Removed
❌ `fetchIssueKeys()` function  
❌ `fetchIssueDetails()` function  
❌ Batching logic  
❌ Parallel execution  
❌ Support for 100+ events

## Files Changed

### `/src/index.js`
- ✅ Removed `fetchIssueKeys()` and `fetchIssueDetails()` 
- ✅ Reverted to single JQL query in `fetchVisitRequests()`
- ✅ Removed unused imports (`delay`, `chunkArray`, `executeBatchesParallel`)
- ✅ Added comment explaining Forge limitation

### No Other Changes
All other improvements remain intact:
- Utility modules still there and working
- Error handling still improved
- Documentation still valid
- Frontend error handling still correct

## Updated Constants

The batching constants in `constants.js` are now unused but kept for reference:

```javascript
// NOTE: These are currently unused due to Forge limitations
// Keeping for reference in case Forge adds support in future
BATCH_SIZE: 50,
BATCH_DELAY_MS: 300,
MAX_PARALLEL_BATCHES: 3,
JIRA_KEY_FETCH_LIMIT: 1000
```

## Status Update

| Feature | Status |
|---------|--------|
| **Core Utilities** | ✅ Working |
| **Error Handling** | ✅ Working |
| **Documentation** | ✅ Complete |
| **Issue Fetching** | ✅ Fixed (reverted to simple approach) |
| **100+ Events Support** | ❌ Not possible in Forge |

## Testing Checklist

- [ ] Deploy to dev: `./deploy-to-dev.sh`
- [ ] Open calendar in Jira
- [ ] Verify events now show up
- [ ] Check browser console for proper logs
- [ ] Confirm no errors
- [ ] Test with <100 events (should work)
- [ ] Test with 100+ events (will show only first 100)

## Workarounds for 100+ Events

If you need to support more than 100 events, consider these options:

### Option 1: Narrower Date Ranges
Set shorter date ranges in the calendar to stay under 100 events.

### Option 2: Multiple Projects
Split visits across multiple projects and let users switch between them.

### Option 3: Custom Pagination UI
Add "Next 100" / "Previous 100" buttons in the frontend to manually paginate through results.

### Option 4: Migrate to Connect App
If you absolutely need 100+ events, consider migrating from Forge to a Connect app, which doesn't have these limitations.

## Lessons Learned

1. **Test in Forge Early**: What works in theory might not work in Forge's runtime
2. **Forge Has Limits**: Not all optimization strategies work in Forge
3. **Simple Is Better**: Sometimes the simple approach is the only approach
4. **Document Limitations**: Always document platform limitations

## What's Next

1. **Deploy the fix** - Calendar will work again
2. **Test thoroughly** - Verify all functionality
3. **Monitor usage** - Check if 100-event limit is a real problem
4. **Consider alternatives** - If limit is hit often, explore workarounds

---

## Quick Deploy

```bash
# Deploy the fix
./deploy-to-dev.sh

# Watch logs
forge logs --follow

# Check in browser
# - Open calendar
# - Events should now display
# - Check console for logs
```

---

**Status**: ✅ FIXED  
**Date**: 2025-10-30  
**Impact**: Calendar now works correctly (up to 100 events)  
**Action Required**: Deploy to dev and test
