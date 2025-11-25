# Progress History & Trends View - Example Outputs

This module analyzes historical task-activity data and transforms it into clear, meaningful, visually friendly progress summaries. Here are examples of the insights users will see:

## 📊 Week-by-Week Comparison Charts

Users can toggle between 4 different views:

### Tasks Chart (Line Graph)
Shows the number of tasks completed each week, with visual trend lines indicating growth or stability.

### Efficiency Chart (Line Graph)
Displays efficiency percentage (0-100%) over time, showing how focused work time compares to total time.

### Consistency Chart (Bar Graph)
Shows weekly consistency scores based on how evenly tasks are distributed across days.

### Focus Hours Chart (Line Graph)
Tracks total active focus hours per week, highlighting productivity momentum.

---

## 🌟 Weekly Progress & Improvement Trends

### Growth Indicators

**"This week you completed 3 more tasks than last week — beautiful momentum!"**
> Your productivity is naturally expanding.
> _Badge: Growing ↑ | Category: Growth_

**"This week you completed tasks faster than last week — a clear sign your flow is strengthening."**
> 15% speed improvement shows real progress.
> _Badge: Growing ↑ | Category: Speed_

**"Your active focus time increased this week — you're building great momentum."**
> More sustained attention leads to deeper work.
> _Badge: Growing ↑ | Category: Focus_

### Stability Indicators

**"Your task completion stayed wonderfully consistent this week."**
> Steady rhythm is a sign of healthy work patterns.
> _Badge: Stable → | Category: Consistency_

**"Your work pattern stayed beautifully consistent across the week. Nice balance!"**
> This steady rhythm is a real strength.
> _Badge: Stable → | Category: Consistency_

### Multi-Week Trends

**"Your completion time has gently improved over the past three weeks."**
> Consistent progress builds sustainable momentum.
> _Badge: Growing ↑ | Category: Speed_

**"Your consistency score has been rising steadily. Great work!"**
> This reliability is building strong habits.
> _Badge: Stable → | Category: Consistency_

**"Your efficiency is trending upward week over week."**
> You're finding your natural flow state more easily.
> _Badge: Growing ↑ | Category: Momentum_

---

## 🔥 Streak History & Momentum

### Active Current Streaks

**6-day streak**
_Jan 15 - Jan 21, 2025_
> **Active Now** badge
> "Keep going! Each day adds to your journey. 🚀"

### Past Streaks with Context

**8-day streak** ⭐ Personal Best
_Jan 1 - Jan 9, 2025_
> **Reset Reason**: "One day gap — totally normal for weekends or rest days."
> _Badge: Personal Best | Incredible commitment! 🌟_

**5-day streak**
_Dec 20 - Dec 25, 2024_
> **Reset Reason**: "A few quiet days — your rhythm naturally ebbs and flows."
> _Badge: Building strong momentum! 💪_

**4-day streak**
_Dec 10 - Dec 14, 2024_
> **Reset Reason**: "Extended break — welcome back! Fresh starts build new momentum."
> _Badge: Building strong momentum! 💪_

### Streak Badges

- **7+ days**: "Incredible commitment! 🌟" (Purple badge: Personal Best)
- **4-6 days**: "Building strong momentum! 💪" (Blue badge)
- **2-3 days**: Building consistency
- **Current**: Orange flame icon with "Active Now" badge

---

## 📅 Monthly Growth Summaries

### Growth Achievements

**"This month shows wonderful progress — you've completed more tasks with growing confidence."**
> 47 tasks completed this month.
> _Badge: Growing ↑ | Category: Growth_

**"Your efficiency stayed strong all month — amazing consistency."**
> Sustained focus is building powerful momentum.
> _Badge: Stable → | Category: Focus_

**"You created steady growth this month with balanced effort and thoughtful pacing."**
> This rhythm is sustainable and healthy.
> _Badge: Harmonious ○ | Category: Consistency_

**"Your reliability stayed high all month, and your streaks grew longer. Amazing consistency."**
> Month-over-month improvement in streak maintenance.
> _Badge: Growing ↑ | Category: Momentum_

---

## 🎨 Visual Elements & Color Coding

### Indicator Types

- **Growing ↑** - Green colors, TrendingUp icon
  - Used for: Increased tasks, faster completion, rising efficiency
  
- **Stable →** - Blue colors, Minus icon
  - Used for: Consistent performance, steady patterns
  
- **Balanced ~** - Purple colors, Activity icon
  - Used for: Gentle improvements, natural rhythms
  
- **Harmonious ○** - Indigo colors, Target icon
  - Used for: Perfect balance, sustainable patterns

### Category Icons

- **Speed** ⚡ - Zap icon (for completion time improvements)
- **Focus** 🎯 - Target icon (for attention and concentration)
- **Consistency** 📊 - BarChart icon (for steady patterns)
- **Momentum** 📈 - TrendingUp icon (for building energy)
- **Growth** 🏆 - Award icon (for overall progress)

---

## 💬 Early Stage Messages

### Less Than 3 Tasks Total

**"You're just getting started — keep building your rhythm!"**
> Complete more tasks to unlock your personal progress story.
> _Badge: Stable → | Category: Growth_

### Less Than 2 Weeks of Data

**"You're building your first full week of data!"**
> Keep going — your progress story is just beginning.
> _Badge: Growing ↑ | Category: Growth_

### Less Than 4 Weeks of Data (Monthly)

**"You're building your first month of data!"**
> Each week adds to your growth story.
> _Badge: Growing ↑ | Category: Growth_

---

## 📈 Chart Data Examples

### Weekly Performance Data

| Week | Tasks | Efficiency | Consistency | Focus Hours |
|------|-------|-----------|-------------|-------------|
| Jan 1-7 | 12 | 78% | 85 | 24.5 |
| Jan 8-14 | 15 | 82% | 88 | 28.2 |
| Jan 15-21 | 18 | 85% | 90 | 31.7 |
| Jan 22-28 | 16 | 83% | 87 | 29.4 |

Visual trends show:
- **Tasks**: Upward trend with gentle dip in week 4
- **Efficiency**: Steady climb from 78% to 85%
- **Consistency**: Highly stable around 85-90
- **Focus Hours**: Growing investment in deep work

---

## 🎯 Key Features

✅ **Always positive and encouraging** - Never blame or negativity
✅ **Story-like summaries** - Easy to read, visually oriented
✅ **Context for resets** - Streak breaks explained supportively
✅ **Multi-timeframe analysis** - Week-by-week, multi-week trends, monthly
✅ **Visual comparison** - Interactive charts with tabs
✅ **Meaningful metrics** - Tasks, efficiency, consistency, focus
✅ **Personal bests** - Celebrates longest streaks
✅ **Growth-focused** - Every message frames progress positively

---

## 🚀 Technical Implementation

- **Analysis Period**: Last 8 weeks of time entries
- **Minimum Data**: 3 tasks for basic insights, 2+ weeks for weekly comparisons, 4+ weeks for monthly
- **Update Frequency**: Real-time with Supabase subscriptions
- **Chart Types**: Line charts (tasks, efficiency, focus), Bar charts (consistency)
- **Streak Detection**: Tracks daily activity with intelligent reset reasoning
- **Tone**: Warm, supportive, human, non-judgmental

---

## 💡 Reset Reasons Logic

The system intelligently explains why streaks ended:

- **1-2 day gap**: "One day gap — totally normal for weekends or rest days."
- **3-4 day gap**: "A few quiet days — your rhythm naturally ebbs and flows."
- **5+ day gap**: "Extended break — welcome back! Fresh starts build new momentum."

All explanations are supportive and normalize the natural ebb and flow of productivity.



