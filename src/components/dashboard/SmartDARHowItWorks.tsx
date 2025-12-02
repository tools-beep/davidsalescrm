import React from 'react';
import {
  Activity,
  Brain,
  TrendingUp,
  Zap,
  CalendarClock,
  BatteryCharging,
  PieChart,
  Gauge,
  Target,
  CheckCircle2,
  Bell,
  Award,
  BarChart3,
  Sparkles,
  Clock,
  ListChecks,
  HelpCircle,
  Info,
  Flame,
  Star,
  Gift,
  ArrowRight,
  Heart,
  Coffee,
  Sunrise,
  Sunset,
  AlertCircle,
  Trophy,
  Calendar,
  Repeat,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

// Pastel Macaroon Color Palette
const COLORS = {
  primary: '#A08CD9',
  secondary: '#8DB7E3',
  accent: '#F8C97F',
  success: '#CFF5D6',
  warning: '#FFD59E',
  info: '#BFD9FF',
  pink: '#E3A5C7',
  peach: '#FBC7A7',
  lavender: '#E3C4F5',
  mint: '#B8E6D5',
  warmText: '#6B5B95',
  softGray: '#F8F9FA',
};

const SmartDARHowItWorks: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* 🟣 SECTION 1 — HEADER */}
        <div className="text-center space-y-4 animate-fade-in">
          <h1 className="text-5xl font-bold bg-gradient-to-r from-purple-600 via-blue-600 to-pink-600 bg-clip-text text-transparent">
            How Smart DAR Works
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
            A complete guide to how your dashboard measures performance, energy, behavior, and progress — 
            gently, fairly, and intelligently.
          </p>
        </div>

        {/* 🟢 SECTION 2 — SMART DASHBOARD OVERVIEW */}
        <Card className="rounded-[22px] shadow-lg border-0" style={{ backgroundColor: COLORS.softGray }}>
          <CardHeader>
            <CardTitle className="flex items-center gap-3 text-2xl" style={{ color: COLORS.warmText }}>
              <Sparkles className="h-7 w-7" style={{ color: COLORS.primary }} />
              Smart Dashboard Overview
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-gray-700 leading-relaxed">
              Your Smart DAR Dashboard is a live, intelligent productivity companion that tracks your work patterns, 
              energy levels, and behavioral trends in real-time. It's designed with a motivation-first philosophy, 
              using soft pastel colors and gentle feedback to help you understand your work style without judgment.
            </p>
            <div className="grid md:grid-cols-2 gap-4 mt-6">
              <div className="flex items-start gap-3 p-4 rounded-xl bg-white/70">
                <Activity className="h-5 w-5 mt-1" style={{ color: COLORS.primary }} />
                <div>
                  <h4 className="font-semibold text-gray-800">Live Updates</h4>
                  <p className="text-sm text-gray-600">All metrics update in real-time as you work, giving you instant feedback.</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-4 rounded-xl bg-white/70">
                <Heart className="h-5 w-5 mt-1" style={{ color: COLORS.pink }} />
                <div>
                  <h4 className="font-semibold text-gray-800">Motivation-First Design</h4>
                  <p className="text-sm text-gray-600">Gentle colors, supportive language, and fair scoring keep you motivated.</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-4 rounded-xl bg-white/70">
                <Target className="h-5 w-5 mt-1" style={{ color: COLORS.accent }} />
                <div>
                  <h4 className="font-semibold text-gray-800">Your Progress Only</h4>
                  <p className="text-sm text-gray-600">You see only your own data, trends, and insights — private and personal.</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-4 rounded-xl bg-white/70">
                <BarChart3 className="h-5 w-5 mt-1" style={{ color: COLORS.secondary }} />
                <div>
                  <h4 className="font-semibold text-gray-800">Team View for Admins</h4>
                  <p className="text-sm text-gray-600">Admins can view team metrics while respecting individual privacy.</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-4 rounded-xl bg-white/70">
                <Sparkles className="h-5 w-5 mt-1" style={{ color: COLORS.success }} />
                <div>
                  <h4 className="font-semibold text-gray-800">Intelligent Insights</h4>
                  <p className="text-sm text-gray-600">AI-powered behavioral analysis reveals your unique work patterns.</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 🔵 SECTION 3 — TASK SYSTEM */}
        <Card className="rounded-[22px] shadow-lg border-0" style={{ backgroundColor: COLORS.softGray }}>
          <CardHeader>
            <CardTitle className="flex items-center gap-3 text-2xl" style={{ color: COLORS.warmText }}>
              <ListChecks className="h-7 w-7" style={{ color: COLORS.secondary }} />
              Task System — How DAR Understands Every Task
            </CardTitle>
            <CardDescription className="text-base mt-2">
              Every task you start includes metadata that helps DAR understand your work style and provide accurate insights.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            
            {/* Task Type */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Badge style={{ backgroundColor: COLORS.primary, color: 'white' }}>Required</Badge>
                <h3 className="text-lg font-semibold text-gray-800">Task Type</h3>
              </div>
              <p className="text-gray-700 leading-relaxed">
                <strong>Options:</strong> Quick Task, Standard Task, Deep Work Task, Long Task, Very Long Task
              </p>
              <p className="text-gray-600 leading-relaxed">
                Task Type is the foundation of how DAR adjusts expectations for your work. <strong>Quick Tasks</strong> allow 
                zero pauses and are expected to be completed rapidly. <strong>Standard Tasks</strong> allow 1 pause and are 
                typical daily work. <strong>Deep Work Tasks</strong> allow 2 pauses and earn higher velocity points (3x weight). 
                <strong>Long Tasks</strong> allow 2 pauses and earn 4x velocity weight. <strong>Very Long Tasks</strong> allow 
                3 pauses and earn 5x velocity weight. DAR uses Task Type to calculate Focus Index (allowed pauses), Velocity 
                (weighted points), Momentum (deep engagement detection), and Estimation Accuracy (grace windows: Quick 20%, 
                Standard 25%, Deep Work 40%, Long 50%, Very Long 60%).
              </p>
            </div>

            <Separator />

            {/* Goal Duration */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Badge style={{ backgroundColor: COLORS.primary, color: 'white' }}>Required</Badge>
                <h3 className="text-lg font-semibold text-gray-800">Goal Duration</h3>
              </div>
              <p className="text-gray-700 leading-relaxed">
                <strong>Purpose:</strong> Your time estimate for completing the task
              </p>
              <p className="text-gray-600 leading-relaxed">
                Goal Duration is how long you think the task will take. DAR uses this to calculate <strong>Estimation Accuracy</strong> 
                (one of the two Completion Rate factors). If your actual time is within the grace window for your task type, you earn 
                full accuracy credit. DAR also sends <strong>progress notifications</strong> at 40%, 60%, 80%, 100%, and 110% of your 
                goal duration. For example, if you set 60 minutes, you'll get gentle alerts at 24min, 36min, 48min, 60min, and 66min. 
                These help you stay aware of time without being intrusive. The fairness buffer (grace window) ensures you're not penalized 
                for minor estimation errors — Deep Work and Long tasks get more lenient buffers because they're harder to estimate.
              </p>
            </div>

            <Separator />

            {/* Task Priority */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Badge style={{ backgroundColor: COLORS.primary, color: 'white' }}>Required</Badge>
                <h3 className="text-lg font-semibold text-gray-800">Task Priority</h3>
              </div>
              <p className="text-gray-700 leading-relaxed">
                <strong>Options:</strong> Immediate Impact, Daily, Weekly, Monthly, Evergreen, Trigger
              </p>
              <p className="text-gray-600 leading-relaxed">
                Task Priority determines the strategic value of your work. <strong>Immediate Impact</strong> tasks earn 4x weight in 
                Priority Completion Rate and 1.4x velocity multiplier — these are urgent, high-stakes tasks. <strong>Daily Tasks</strong> 
                earn 3x weight and 1.2x velocity. <strong>Weekly Tasks</strong> earn 2x weight and 1.0x velocity. <strong>Monthly Tasks</strong> 
                earn 1.5x weight and 0.9x velocity. <strong>Evergreen Tasks</strong> earn 1x weight and 0.8x velocity. <strong>Trigger Tasks</strong> 
                earn 2.5x weight and 1.0x velocity. Priority also influences Focus Index (Immediate/Daily tasks have stricter pause limits; 
                Evergreen/Monthly tasks are more lenient). DAR uses Priority to calculate <strong>Priority Completion Rate</strong> (70% of 
                your final Completion Score), detect priority alignment patterns in Consistency, and generate deep behavior insights like 
                "You completed 83% of your high-priority tasks this week."
              </p>
            </div>

            <Separator />

            {/* Task Category */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Badge variant="outline" style={{ borderColor: COLORS.accent, color: COLORS.warmText }}>Optional</Badge>
                <h3 className="text-lg font-semibold text-gray-800">Task Category</h3>
              </div>
              <p className="text-gray-700 leading-relaxed">
                <strong>Examples:</strong> Creative, Admin, Research, Technical, Client Work, Internal, Planning, Review
              </p>
              <p className="text-gray-600 leading-relaxed">
                Task Category helps DAR understand the <strong>nature</strong> of your work. Categories are used to generate 
                <strong> category distribution insights</strong> like "You spent 40% of your time on Creative work this week" or 
                "Your most enjoyable category is Research." Categories also appear in visual pie charts, helping you see if your 
                work balance matches your goals. For example, if you're a designer but spend 70% of your time on Admin tasks, DAR 
                will highlight this pattern. Categories don't affect scoring — they're purely for understanding and visualization.
              </p>
            </div>

            <Separator />

            {/* Task Intent */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Badge variant="outline" style={{ borderColor: COLORS.accent, color: COLORS.warmText }}>Optional</Badge>
                <h3 className="text-lg font-semibold text-gray-800">Task Intent</h3>
              </div>
              <p className="text-gray-700 leading-relaxed">
                <strong>Purpose:</strong> Why you're doing this task (e.g., "Finish client deliverable," "Learn new skill")
              </p>
              <p className="text-gray-600 leading-relaxed">
                Task Intent is a free-text field that supports <strong>behavioral analysis</strong>. While it doesn't affect metrics 
                directly, it helps DAR's insights engine understand your motivations and goals. For example, if you frequently write 
                "Learn" as your intent, DAR might notice you enjoy growth-oriented tasks. Intent also helps you reflect on your work 
                when reviewing completed tasks. It's entirely optional but can enrich your self-awareness over time.
              </p>
            </div>

          </CardContent>
        </Card>

        {/* 🔔 SECTION 4 — NOTIFICATION SYSTEM */}
        <Card className="rounded-[22px] shadow-lg border-0" style={{ backgroundColor: COLORS.softGray }}>
          <CardHeader>
            <CardTitle className="flex items-center gap-3 text-2xl" style={{ color: COLORS.warmText }}>
              <Bell className="h-7 w-7" style={{ color: COLORS.warning }} />
              Notification System — Gentle, Timely, Supportive
            </CardTitle>
            <CardDescription className="text-base mt-2">
              DAR sends soft pastel notifications with gentle animations and sound to keep you informed without being intrusive.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-gray-700 leading-relaxed mb-6">
              Notifications appear as <strong>soft pastel bubbles</strong> with smooth fade-in animations and a gentle chime. 
              They're designed to inform, not interrupt. Here's when you'll receive them:
            </p>

            <div className="grid md:grid-cols-2 gap-4">
              
              {/* Task Progress Notifications */}
              <div className="p-4 rounded-xl bg-white/70 space-y-2">
                <div className="flex items-center gap-2">
                  <Clock className="h-5 w-5" style={{ color: COLORS.secondary }} />
                  <h4 className="font-semibold text-gray-800">Task Progress Milestones</h4>
                </div>
                <ul className="text-sm text-gray-600 space-y-1 ml-7">
                  <li>• 40% of goal duration reached</li>
                  <li>• 60% of goal duration reached</li>
                  <li>• 80% of goal duration reached</li>
                  <li>• 100% of goal duration reached</li>
                  <li>• 110% of goal duration (over time)</li>
                </ul>
              </div>

              {/* Behind Schedule */}
              <div className="p-4 rounded-xl bg-white/70 space-y-2">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5" style={{ color: COLORS.warning }} />
                  <h4 className="font-semibold text-gray-800">Behind Schedule</h4>
                </div>
                <p className="text-sm text-gray-600 ml-7">
                  "You're running a bit over your estimate — no worries, take your time!"
                </p>
              </div>

              {/* Energy Notifications */}
              <div className="p-4 rounded-xl bg-white/70 space-y-2">
                <div className="flex items-center gap-2">
                  <BatteryCharging className="h-5 w-5" style={{ color: COLORS.info }} />
                  <h4 className="font-semibold text-gray-800">Energy Insights</h4>
                </div>
                <ul className="text-sm text-gray-600 space-y-1 ml-7">
                  <li>• Energy dip detected: "Consider a short break"</li>
                  <li>• Peak energy window: "Ideal time for deep work"</li>
                  <li>• Stable energy: "Amazing stability today!"</li>
                  <li>• Low check-in rate: "Insights may be less accurate"</li>
                </ul>
              </div>

              {/* Rhythm Notifications */}
              <div className="p-4 rounded-xl bg-white/70 space-y-2">
                <div className="flex items-center gap-2">
                  <Sunrise className="h-5 w-5" style={{ color: COLORS.accent }} />
                  <h4 className="font-semibold text-gray-800">Rhythm Patterns</h4>
                </div>
                <ul className="text-sm text-gray-600 space-y-1 ml-7">
                  <li>• "You're in your peak energy window"</li>
                  <li>• "Your energy dips around now — break time?"</li>
                  <li>• Rhythm instability detected</li>
                </ul>
              </div>

              {/* Focus Index Notifications */}
              <div className="p-4 rounded-xl bg-white/70 space-y-2">
                <div className="flex items-center gap-2">
                  <Brain className="h-5 w-5" style={{ color: COLORS.accent }} />
                  <h4 className="font-semibold text-gray-800">Focus Index</h4>
                </div>
                <ul className="text-sm text-gray-600 space-y-1 ml-7">
                  <li>• "You're exceeding expected focus!"</li>
                  <li>• "Try to complete the next segment in one go"</li>
                  <li>• High focus streak detected</li>
                </ul>
              </div>

              {/* Momentum Notifications */}
              <div className="p-4 rounded-xl bg-white/70 space-y-2">
                <div className="flex items-center gap-2">
                  <Zap className="h-5 w-5" style={{ color: COLORS.warning }} />
                  <h4 className="font-semibold text-gray-800">Momentum Flow</h4>
                </div>
                <ul className="text-sm text-gray-600 space-y-1 ml-7">
                  <li>• "Strong start! Building early momentum"</li>
                  <li>• "Your task streak is creating amazing flow"</li>
                  <li>• Momentum sustained for 2+ hours</li>
                </ul>
              </div>

              {/* Consistency Notifications */}
              <div className="p-4 rounded-xl bg-white/70 space-y-2">
                <div className="flex items-center gap-2">
                  <CalendarClock className="h-5 w-5" style={{ color: COLORS.success }} />
                  <h4 className="font-semibold text-gray-800">Consistency Patterns</h4>
                </div>
                <ul className="text-sm text-gray-600 space-y-1 ml-7">
                  <li>• "Your work pattern matches your weekly rhythm"</li>
                  <li>• "Nice mix of task types — strong consistency"</li>
                  <li>• Daily time trend is stable</li>
                </ul>
              </div>

              {/* Utilization Notifications */}
              <div className="p-4 rounded-xl bg-white/70 space-y-2">
                <div className="flex items-center gap-2">
                  <PieChart className="h-5 w-5" style={{ color: COLORS.pink }} />
                  <h4 className="font-semibold text-gray-800">Utilization Flow</h4>
                </div>
                <ul className="text-sm text-gray-600 space-y-1 ml-7">
                  <li>• "Great flow! 45+ minutes of active work"</li>
                  <li>• High utilization streak detected</li>
                </ul>
              </div>

              {/* Streak Notifications */}
              <div className="p-4 rounded-xl bg-white/70 space-y-2">
                <div className="flex items-center gap-2">
                  <Flame className="h-5 w-5" style={{ color: COLORS.warning }} />
                  <h4 className="font-semibold text-gray-800">Streak Alerts</h4>
                </div>
                <ul className="text-sm text-gray-600 space-y-1 ml-7">
                  <li>• Streak at risk: "Don't break your 5-day streak!"</li>
                  <li>• Streak extended: "7 days in a row! 🔥"</li>
                  <li>• Weekend warrior bonus earned</li>
                </ul>
              </div>

              {/* Goal Achievements */}
              <div className="p-4 rounded-xl bg-white/70 space-y-2">
                <div className="flex items-center gap-2">
                  <Trophy className="h-5 w-5" style={{ color: COLORS.accent }} />
                  <h4 className="font-semibold text-gray-800">Goal Achievements</h4>
                </div>
                <ul className="text-sm text-gray-600 space-y-1 ml-7">
                  <li>• Daily task goal achieved</li>
                  <li>• 2 deep work sessions completed</li>
                  <li>• Immediate Impact task finished</li>
                  <li>• Long task completed successfully</li>
                  <li>• Highly accurate estimation</li>
                </ul>
              </div>

              {/* Encouragement */}
              <div className="p-4 rounded-xl bg-white/70 space-y-2">
                <div className="flex items-center gap-2">
                  <Star className="h-5 w-5" style={{ color: COLORS.success }} />
                  <h4 className="font-semibold text-gray-800">Random Encouragement</h4>
                </div>
                <ul className="text-sm text-gray-600 space-y-1 ml-7">
                  <li>• "You're doing great today!"</li>
                  <li>• "Strong focus — keep it up!"</li>
                  <li>• "Your consistency is impressive"</li>
                </ul>
              </div>

              {/* Priority Alignment */}
              <div className="p-4 rounded-xl bg-white/70 space-y-2">
                <div className="flex items-center gap-2">
                  <Target className="h-5 w-5" style={{ color: COLORS.primary }} />
                  <h4 className="font-semibold text-gray-800">Priority Alignment</h4>
                </div>
                <ul className="text-sm text-gray-600 space-y-1 ml-7">
                  <li>• "Great priority focus today"</li>
                  <li>• "You're tackling high-impact work"</li>
                </ul>
              </div>

            </div>
          </CardContent>
        </Card>

        {/* 🟡 SECTION 5 — POINT SYSTEM */}
        <Card className="rounded-[22px] shadow-lg border-0" style={{ backgroundColor: COLORS.softGray }}>
          <CardHeader>
            <CardTitle className="flex items-center gap-3 text-2xl" style={{ color: COLORS.warmText }}>
              <Award className="h-7 w-7" style={{ color: COLORS.accent }} />
              Point System — Earn Rewards for Great Work
            </CardTitle>
            <CardDescription className="text-base mt-2">
              Every positive action earns you points. Points are saved daily, weekly, monthly, and lifetime.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <p className="text-gray-700 leading-relaxed">
              The Point System rewards you for completing tasks, maintaining consistency, answering check-ins, and achieving goals. 
              When you earn points, you'll see a <strong>swooping notification</strong> with a gentle animation: 
              <span className="font-semibold text-purple-600"> "You earned +X points!"</span>
            </p>

            <div className="grid md:grid-cols-2 gap-4">
              
              <div className="p-4 rounded-xl bg-white/70">
                <h4 className="font-semibold text-gray-800 mb-2">Task Completion</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• Completing any task: <strong>+10 points</strong></li>
                  <li>• Completing Immediate Impact task: <strong>+25 points</strong></li>
                  <li>• Completing Daily task: <strong>+15 points</strong></li>
                  <li>• Completing Deep Work task: <strong>+20 points</strong></li>
                  <li>• Completing Long/Very Long task: <strong>+30 points</strong></li>
                </ul>
              </div>

              <div className="p-4 rounded-xl bg-white/70">
                <h4 className="font-semibold text-gray-800 mb-2">Estimation Accuracy</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• Within grace window: <strong>+5 points</strong></li>
                  <li>• Highly accurate (within 10%): <strong>+10 points</strong></li>
                  <li>• Perfect estimate: <strong>+15 points</strong></li>
                </ul>
              </div>

              <div className="p-4 rounded-xl bg-white/70">
                <h4 className="font-semibold text-gray-800 mb-2">Check-In Engagement</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• Answering mood check-in: <strong>+2 points</strong></li>
                  <li>• Answering energy check-in: <strong>+2 points</strong></li>
                  <li>• High responsiveness (&gt;90%): <strong>+10 points</strong></li>
                </ul>
              </div>

              <div className="p-4 rounded-xl bg-white/70">
                <h4 className="font-semibold text-gray-800 mb-2">Shift & Goal Accuracy</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• Meeting daily shift goal: <strong>+15 points</strong></li>
                  <li>• Meeting daily task goal: <strong>+20 points</strong></li>
                  <li>• Exceeding task goal: <strong>+30 points</strong></li>
                </ul>
              </div>

              <div className="p-4 rounded-xl bg-white/70">
                <h4 className="font-semibold text-gray-800 mb-2">High Performance</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• Momentum score &gt;85: <strong>+15 points</strong></li>
                  <li>• Consistency score &gt;85: <strong>+15 points</strong></li>
                  <li>• Energy stability &gt;80: <strong>+10 points</strong></li>
                  <li>• Peak velocity day: <strong>+20 points</strong></li>
                  <li>• High efficiency (&gt;90%): <strong>+15 points</strong></li>
                </ul>
              </div>

              <div className="p-4 rounded-xl bg-white/70">
                <h4 className="font-semibold text-gray-800 mb-2">Streaks & Templates</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• 5-day streak: <strong>+50 points</strong></li>
                  <li>• 10-day streak: <strong>+100 points</strong></li>
                  <li>• 20-day streak: <strong>+250 points</strong></li>
                  <li>• Monthly streak: <strong>+500 points</strong></li>
                  <li>• Weekend warrior bonus: <strong>+30 points</strong></li>
                  <li>• Using recurring template: <strong>+5 points</strong></li>
                </ul>
              </div>

              <div className="p-4 rounded-xl bg-white/70">
                <h4 className="font-semibold text-gray-800 mb-2">Focus & Flow</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• Completing task without pausing: <strong>+10 points</strong></li>
                  <li>• Finishing shift without overdue tasks: <strong>+20 points</strong></li>
                  <li>• 45+ minutes of uninterrupted work: <strong>+15 points</strong></li>
                </ul>
              </div>

            </div>

            <div className="mt-6 p-6 rounded-xl bg-gradient-to-r from-purple-100 to-pink-100">
              <h4 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                <Info className="h-5 w-5" style={{ color: COLORS.primary }} />
                Where You'll See Your Points
              </h4>
              <ul className="text-sm text-gray-700 space-y-2">
                <li>• <strong>Badge under your profile</strong> — fills as you earn points</li>
                <li>• <strong>Point history log</strong> — see every point earned with timestamp</li>
                <li>• <strong>Weekly point summary</strong> — total points earned this week</li>
                <li>• <strong>Monthly point summary</strong> — total points earned this month</li>
                <li>• <strong>Lifetime total</strong> — your all-time point count</li>
              </ul>
            </div>

            <div className="mt-4 p-4 rounded-xl bg-yellow-50 border-2 border-yellow-200">
              <p className="text-sm text-gray-700 flex items-center gap-2">
                <Gift className="h-5 w-5" style={{ color: COLORS.accent }} />
                <strong>Coming Soon:</strong> Rewards Store where you can redeem points for perks, badges, and custom themes!
              </p>
            </div>

          </CardContent>
        </Card>

        {/* 🔴 SECTION 6 — THE 10 METRICS */}
        <Card className="rounded-[22px] shadow-lg border-0" style={{ backgroundColor: COLORS.softGray }}>
          <CardHeader>
            <CardTitle className="flex items-center gap-3 text-2xl" style={{ color: COLORS.warmText }}>
              <Gauge className="h-7 w-7" style={{ color: COLORS.secondary }} />
              The 10 Metrics — How DAR Measures Your Work
            </CardTitle>
            <CardDescription className="text-base mt-2">
              Each metric tells a different story about your productivity, energy, and behavior. Together, they create a complete picture.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-8">

            {/* Efficiency */}
            <div className="p-6 rounded-xl bg-white/70 space-y-3">
              <div className="flex items-center gap-3">
                <Activity className="h-6 w-6" style={{ color: COLORS.primary }} />
                <h3 className="text-xl font-semibold text-gray-800">1. Efficiency</h3>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-semibold text-gray-700">What It Measures:</p>
                <p className="text-sm text-gray-600">
                  How well you use your clocked-in time. It compares active work time to total clocked-in time, 
                  only counting true idle time (when you're clocked in with zero active tasks).
                </p>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-semibold text-gray-700">How It Works:</p>
                <p className="text-sm text-gray-600">
                  <strong>Formula:</strong> Active Time ÷ (Active Time + True Idle Time) × 100. 
                  True idle time only accumulates when you're clocked in AND have no active tasks. Paused tasks don't 
                  count as idle if another task is active. Additionally, Efficiency factors in how accurately you estimate 
                  task durations (goal duration vs actual duration), rewarding precise time management.
                </p>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-semibold text-gray-700">Why It Matters:</p>
                <p className="text-sm text-gray-600">
                  Efficiency helps you understand if you're making the most of your clocked-in time. High efficiency means 
                  you're actively working most of the time. Low efficiency suggests you might benefit from shorter shifts or 
                  more structured breaks. It's not about working harder — it's about working smarter.
                </p>
              </div>
            </div>

            {/* Completion Rate */}
            <div className="p-6 rounded-xl bg-white/70 space-y-3">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-6 w-6" style={{ color: COLORS.secondary }} />
                <h3 className="text-xl font-semibold text-gray-800">2. Completion Rate</h3>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-semibold text-gray-700">What It Measures:</p>
                <p className="text-sm text-gray-600">
                  How well you complete high-priority tasks and how accurately you meet your estimated times. It's a weighted 
                  score combining strategic task selection and precise planning.
                </p>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-semibold text-gray-700">How It Works:</p>
                <p className="text-sm text-gray-600">
                  <strong>Formula:</strong> (Priority Completion × 0.7) + (Estimation Accuracy × 0.3). 
                  <strong>Priority Completion</strong> uses weighted scoring (Immediate Impact = 4x, Daily = 3x, Weekly = 2x, 
                  Monthly = 1.5x, Evergreen = 1x). <strong>Estimation Accuracy</strong> checks if your actual time is within 
                  the grace window for your task type (Quick 20%, Standard 25%, Deep Work 40%, Long 50%, Very Long 60%).
                </p>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-semibold text-gray-700">Why It Matters:</p>
                <p className="text-sm text-gray-600">
                  Completion Rate shows if you're focusing on the right work and planning realistically. High scores mean you're 
                  tackling important tasks and estimating well. Low scores suggest you might be overcommitting or underestimating 
                  complexity. It rewards both strategic thinking and self-awareness.
                </p>
              </div>
            </div>

            {/* Focus Index */}
            <div className="p-6 rounded-xl bg-white/70 space-y-3">
              <div className="flex items-center gap-3">
                <Brain className="h-6 w-6" style={{ color: COLORS.accent }} />
                <h3 className="text-xl font-semibold text-gray-800">3. Focus Index</h3>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-semibold text-gray-700">What It Measures:</p>
                <p className="text-sm text-gray-600">
                  How well you maintain concentration based on pauses, task type, priority, and enjoyment. It's strictly 
                  behavior-driven and emotion-neutral.
                </p>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-semibold text-gray-700">How It Works:</p>
                <p className="text-sm text-gray-600">
                  <strong>Formula:</strong> Average Focus Score per Task × 100. Each task gets a focus score based on: 
                  (1) Task Type (base allowed pauses: Quick=0, Standard=1, Deep Work=2, Long=2, Very Long=3), 
                  (2) Priority Adjustment (Immediate/Daily are stricter, Evergreen/Monthly more lenient), 
                  (3) Pause Penalty (20% per excess pause), (4) Enjoyment Boost (10% for enjoyed tasks). 
                  Mood and energy are NOT scored — they're used only for behavioral insights.
                </p>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-semibold text-gray-700">Why It Matters:</p>
                <p className="text-sm text-gray-600">
                  Focus Index reveals your concentration patterns. High focus means you're working in sustained blocks. 
                  Low focus suggests you're context-switching frequently. It's not about being perfect — it's about understanding 
                  when and how you focus best. DAR uses this to suggest optimal work patterns.
                </p>
              </div>
            </div>

            {/* Velocity */}
            <div className="p-6 rounded-xl bg-white/70 space-y-3">
              <div className="flex items-center gap-3">
                <TrendingUp className="h-6 w-6" style={{ color: COLORS.peach }} />
                <h3 className="text-xl font-semibold text-gray-800">4. Velocity</h3>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-semibold text-gray-700">What It Measures:</p>
                <p className="text-sm text-gray-600">
                  Your weighted output per hour, based on the value, priority, and complexity of tasks you complete. 
                  It fairly rewards deep work and long tasks.
                </p>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-semibold text-gray-700">How It Works:</p>
                <p className="text-sm text-gray-600">
                  <strong>Formula:</strong> Weighted Points ÷ Active Hours × 20. Task weights: Quick/Standard=1, Deep Work=3, 
                  Long=4, Very Long=5. Priority multipliers: Immediate=1.4x, Daily=1.2x, Weekly=1.0x, Monthly=0.9x, Evergreen=0.8x. 
                  Includes fairness bonuses: +15% if 60%+ tasks are deep/long work, +10% if 50%+ are long tasks, 
                  +0.3 points per 30min block beyond 90min for long tasks. Normalized to 0-100 scale (5 points/hour = 100%).
                </p>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-semibold text-gray-700">Why It Matters:</p>
                <p className="text-sm text-gray-600">
                  Velocity shows your throughput quality, not just quantity. High velocity means you're completing valuable, 
                  complex work efficiently. Low velocity isn't bad — it might mean you're doing deep, strategic work that takes 
                  time. DAR's fairness bonuses ensure long tasks don't tank your score.
                </p>
              </div>
            </div>

            {/* Rhythm */}
            <div className="p-6 rounded-xl bg-white/70 space-y-3">
              <div className="flex items-center gap-3">
                <Sunrise className="h-6 w-6" style={{ color: COLORS.warning }} />
                <h3 className="text-xl font-semibold text-gray-800">5. Rhythm</h3>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-semibold text-gray-700">What It Measures:</p>
                <p className="text-sm text-gray-600">
                  How well your work patterns align with your natural energy cycles and task timing preferences.
                </p>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-semibold text-gray-700">How It Works:</p>
                <p className="text-sm text-gray-600">
                  Rhythm analyzes when you work, when your energy peaks, and when you tackle different task types. 
                  It detects patterns like "You focus best in the morning" or "Your energy dips at 3 PM." 
                  It's calculated from energy check-ins, task start times, and mood trends over time.
                </p>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-semibold text-gray-700">Why It Matters:</p>
                <p className="text-sm text-gray-600">
                  Rhythm helps you schedule work when you're naturally most productive. If DAR notices you have high energy 
                  at 10 AM, it'll suggest tackling deep work then. Understanding your rhythm means working with your body, 
                  not against it. It's personalized and adapts to your unique patterns.
                </p>
              </div>
            </div>

            {/* Energy */}
            <div className="p-6 rounded-xl bg-white/70 space-y-3">
              <div className="flex items-center gap-3">
                <BatteryCharging className="h-6 w-6" style={{ color: COLORS.info }} />
                <h3 className="text-xl font-semibold text-gray-800">6. Energy</h3>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-semibold text-gray-700">What It Measures:</p>
                <p className="text-sm text-gray-600">
                  Your real energy levels based purely on self-reported check-ins. It measures how energized you feel, 
                  how engaged you are with check-ins, and how stable your energy is throughout the day.
                </p>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-semibold text-gray-700">How It Works:</p>
                <p className="text-sm text-gray-600">
                  <strong>Formula:</strong> (Avg Energy + Survey Responsiveness + Energy Stability) ÷ 3 × 100. 
                  <strong>Avg Energy</strong> converts check-ins to numeric (High=1.0, Medium=0.7, Recharging=0.6, Low=0.4, Drained=0.2). 
                  <strong>Survey Responsiveness</strong> compares actual check-ins to expected (energy every 2h + mood every 90min). 
                  <strong>Energy Stability</strong> uses variance calculation (lower variance = more stable = higher score). 
                  NO task-based penalties. Energy is your state, not your performance.
                </p>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-semibold text-gray-700">Why It Matters:</p>
                <p className="text-sm text-gray-600">
                  Energy tracking helps you understand your physical and mental state patterns. High energy scores mean you're 
                  feeling good and checking in consistently. Low scores suggest you might need more rest or breaks. DAR uses 
                  energy data to generate insights like "Your energy dips at 3 PM" or "You maintained steady energy today." 
                  It's about self-awareness, not judgment.
                </p>
              </div>
            </div>

            {/* Utilization */}
            <div className="p-6 rounded-xl bg-white/70 space-y-3">
              <div className="flex items-center gap-3">
                <PieChart className="h-6 w-6" style={{ color: COLORS.pink }} />
                <h3 className="text-xl font-semibold text-gray-800">7. Utilization</h3>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-semibold text-gray-700">What It Measures:</p>
                <p className="text-sm text-gray-600">
                  How effectively you use your planned shift time. It compares active work time to the shift length 
                  you estimated at clock-in.
                </p>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-semibold text-gray-700">How It Works:</p>
                <p className="text-sm text-gray-600">
                  <strong>Formula:</strong> Active Task Time ÷ Planned Shift Time × 100. When you clock in, you estimate 
                  your shift length (e.g., 4h, 8h). Utilization shows what % of that planned time you spent on active work 
                  (excludes pauses and idle time). 100% = you used your shift exactly as planned (capped, no penalty for 
                  working more). Optional micro-bonus: +5% if you answer &gt;60% of mood/energy surveys (presence signal). 
                  Does NOT overlap with Efficiency (active vs clocked-in time) or Momentum (flow state).
                </p>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-semibold text-gray-700">Why It Matters:</p>
                <p className="text-sm text-gray-600">
                  Utilization helps you plan shifts realistically. If you consistently get 60% utilization, you're planning 
                  8-hour shifts but working 5 hours — so plan 5-hour shifts instead! High utilization means your planning 
                  matches reality. It's about self-awareness and accurate forecasting, not working more hours.
                </p>
              </div>
            </div>

            {/* Momentum */}
            <div className="p-6 rounded-xl bg-white/70 space-y-3">
              <div className="flex items-center gap-3">
                <Zap className="h-6 w-6" style={{ color: COLORS.warning }} />
                <h3 className="text-xl font-semibold text-gray-800">8. Momentum</h3>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-semibold text-gray-700">What It Measures:</p>
                <p className="text-sm text-gray-600">
                  How quickly you enter flow, how long you stay engaged, how enjoyable your tasks are, and how smoothly 
                  you transition between tasks. It's a 4-factor "Flow State Momentum Index."
                </p>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-semibold text-gray-700">How It Works:</p>
                <p className="text-sm text-gray-600">
                  <strong>Formula:</strong> (Entry Momentum + Deep Engagement + Enjoyment + Flow Continuity) ÷ 4 × 100. 
                  <strong>Entry Momentum</strong> checks if you start a task, accumulate 20min active time, or answer a survey 
                  within 90min of clock-in. <strong>Deep Engagement</strong> counts sustained focus blocks (25+ min per task). 
                  <strong>Enjoyment</strong> measures how many tasks you rated 4+ stars. <strong>Flow Continuity</strong> tracks 
                  task-to-task transitions (next task starts within 10min). Includes daily task goal bonus.
                </p>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-semibold text-gray-700">Why It Matters:</p>
                <p className="text-sm text-gray-600">
                  Momentum reveals your flow state quality. High momentum means you're entering work quickly, staying engaged, 
                  enjoying tasks, and transitioning smoothly. Low momentum suggests you might need better task sequencing or 
                  more enjoyable work. It's about creating a sustainable, enjoyable work rhythm.
                </p>
              </div>
            </div>

            {/* Consistency */}
            <div className="p-6 rounded-xl bg-white/70 space-y-3">
              <div className="flex items-center gap-3">
                <CalendarClock className="h-6 w-6" style={{ color: COLORS.success }} />
                <h3 className="text-xl font-semibold text-gray-800">9. Consistency</h3>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-semibold text-gray-700">What It Measures:</p>
                <p className="text-sm text-gray-600">
                  How stable and reliable your work patterns are day-to-day. It's not based on productivity or correctness, 
                  but purely on the consistency of your routines.
                </p>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-semibold text-gray-700">How It Works:</p>
                <p className="text-sm text-gray-600">
                  <strong>Formula:</strong> (Start Time + Active Time + Task Mix + Priority Mix + Mood + Energy Stability) ÷ 6 × 100. 
                  All factors are variance-based: <strong>Start-Time Reliability</strong> (first task hour variance), 
                  <strong>Active Time Stability</strong> (daily active time variance), <strong>Task Mix Stability</strong> 
                  (task type distribution variance), <strong>Priority Mix Stability</strong> (priority distribution variance), 
                  <strong>Mood Stability</strong> (mood variance), <strong>Energy Stability</strong> (energy variance). 
                  Lower variance = more stable = higher score.
                </p>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-semibold text-gray-700">Why It Matters:</p>
                <p className="text-sm text-gray-600">
                  Consistency measures reliability. High consistency means you have predictable work patterns — you start at 
                  similar times, work similar hours, and maintain stable energy/mood. Low consistency suggests variability, 
                  which isn't bad — it just means your schedule is less routine. Consistency helps identify sustainable patterns.
                </p>
              </div>
            </div>

            {/* Priority Completion Rate */}
            <div className="p-6 rounded-xl bg-white/70 space-y-3">
              <div className="flex items-center gap-3">
                <Target className="h-6 w-6" style={{ color: COLORS.primary }} />
                <h3 className="text-xl font-semibold text-gray-800">10. Priority Completion Rate</h3>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-semibold text-gray-700">What It Measures:</p>
                <p className="text-sm text-gray-600">
                  How well you complete high-priority tasks. It's one of the two factors in your overall Completion Rate (70% weight).
                </p>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-semibold text-gray-700">How It Works:</p>
                <p className="text-sm text-gray-600">
                  <strong>Formula:</strong> (Completed Weight ÷ Total Weight) × 100. Weights: Immediate Impact=4, Daily=3, 
                  Weekly=2, Monthly=1.5, Evergreen=1, Trigger=2.5. For all started tasks, add weight to total. For all completed 
                  tasks, add weight to completed. This rewards finishing important work over easy work.
                </p>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-semibold text-gray-700">Why It Matters:</p>
                <p className="text-sm text-gray-600">
                  Priority Completion Rate shows if you're tackling the right work. High scores mean you're focusing on urgent, 
                  high-impact tasks. Low scores suggest you might be avoiding difficult work or prioritizing incorrectly. 
                  It's a strategic metric that rewards smart task selection.
                </p>
              </div>
            </div>

          </CardContent>
        </Card>

        {/* 🟤 SECTION 7 — BEHAVIOR INSIGHTS */}
        <Card className="rounded-[22px] shadow-lg border-0" style={{ backgroundColor: COLORS.softGray }}>
          <CardHeader>
            <CardTitle className="flex items-center gap-3 text-2xl" style={{ color: COLORS.warmText }}>
              <Sparkles className="h-7 w-7" style={{ color: COLORS.success }} />
              Behavior Insights — AI-Powered Pattern Detection
            </CardTitle>
            <CardDescription className="text-base mt-2">
              DAR's insights engine reads all metrics together to detect patterns and produce supportive, actionable insights.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-gray-700 leading-relaxed">
              The Behavior Insights Engine is an AI-powered system that analyzes your complete work profile — all 10 metrics, 
              task history, mood/energy trends, and behavioral patterns — to generate personalized, supportive insights. 
              These insights appear as soft pastel cards throughout your dashboard.
            </p>

            <div className="grid md:grid-cols-2 gap-4 mt-6">
              
              <div className="p-4 rounded-xl bg-purple-50">
                <h4 className="font-semibold text-gray-800 mb-2">Focus Patterns</h4>
                <p className="text-sm text-gray-600 italic">"You focus best between 10 AM–1 PM."</p>
                <p className="text-sm text-gray-600 italic">"Deep Work tasks get your highest focus scores."</p>
              </div>

              <div className="p-4 rounded-xl bg-blue-50">
                <h4 className="font-semibold text-gray-800 mb-2">Task Preferences</h4>
                <p className="text-sm text-gray-600 italic">"You enjoy creative work the most."</p>
                <p className="text-sm text-gray-600 italic">"Research tasks consistently get 5-star ratings."</p>
              </div>

              <div className="p-4 rounded-xl bg-yellow-50">
                <h4 className="font-semibold text-gray-800 mb-2">Energy Trends</h4>
                <p className="text-sm text-gray-600 italic">"Energy dips usually occur around 3 PM."</p>
                <p className="text-sm text-gray-600 italic">"Your peak energy window is 9–11 AM."</p>
              </div>

              <div className="p-4 rounded-xl bg-green-50">
                <h4 className="font-semibold text-gray-800 mb-2">Priority Alignment</h4>
                <p className="text-sm text-gray-600 italic">"Priorities are balanced this week."</p>
                <p className="text-sm text-gray-600 italic">"You completed 83% of high-priority tasks."</p>
              </div>

              <div className="p-4 rounded-xl bg-pink-50">
                <h4 className="font-semibold text-gray-800 mb-2">Momentum Insights</h4>
                <p className="text-sm text-gray-600 italic">"Your best Velocity days happen when you mix quick wins + deep work."</p>
                <p className="text-sm text-gray-600 italic">"Task transitions are smooth today — great flow!"</p>
              </div>

              <div className="p-4 rounded-xl bg-indigo-50">
                <h4 className="font-semibold text-gray-800 mb-2">Consistency Feedback</h4>
                <p className="text-sm text-gray-600 italic">"Your work pattern matches your weekly rhythm."</p>
                <p className="text-sm text-gray-600 italic">"Start times are very consistent this month."</p>
              </div>

            </div>

            <div className="mt-6 p-6 rounded-xl bg-gradient-to-r from-purple-100 to-blue-100">
              <h4 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                <Info className="h-5 w-5" style={{ color: COLORS.primary }} />
                How Insights Are Generated
              </h4>
              <p className="text-sm text-gray-700 leading-relaxed">
                The insights engine runs continuously, analyzing your data in real-time. It looks for correlations, trends, 
                and anomalies across all metrics. For example, if it notices you always have high focus when working on 
                creative tasks in the morning, it'll suggest scheduling more creative work then. Insights are supportive, 
                never judgmental, and designed to help you work with your natural patterns.
              </p>
            </div>

          </CardContent>
        </Card>

        {/* ⚫ SECTION 8 — VISUAL CHARTS */}
        <Card className="rounded-[22px] shadow-lg border-0" style={{ backgroundColor: COLORS.softGray }}>
          <CardHeader>
            <CardTitle className="flex items-center gap-3 text-2xl" style={{ color: COLORS.warmText }}>
              <BarChart3 className="h-7 w-7" style={{ color: COLORS.secondary }} />
              Visual Charts — See Your Patterns at a Glance
            </CardTitle>
            <CardDescription className="text-base mt-2">
              DAR provides beautiful, interactive charts to help you visualize your work patterns and trends.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">

            <div className="grid md:grid-cols-2 gap-6">
              
              <div className="p-5 rounded-xl bg-white/70">
                <h4 className="font-semibold text-gray-800 mb-2 flex items-center gap-2">
                  <PieChart className="h-5 w-5" style={{ color: COLORS.primary }} />
                  Task Priority Pie Chart
                </h4>
                <p className="text-sm text-gray-600 leading-relaxed">
                  Shows the distribution of your tasks by priority (Immediate Impact, Daily, Weekly, Monthly, Evergreen, Trigger). 
                  Helps you see if you're balancing urgent and long-term work. Ideal balance: 20-30% Immediate/Daily, 
                  40-50% Weekly, 20-30% Monthly/Evergreen.
                </p>
              </div>

              <div className="p-5 rounded-xl bg-white/70">
                <h4 className="font-semibold text-gray-800 mb-2 flex items-center gap-2">
                  <PieChart className="h-5 w-5" style={{ color: COLORS.accent }} />
                  Task Category Pie Chart
                </h4>
                <p className="text-sm text-gray-600 leading-relaxed">
                  Shows the distribution of your tasks by category (Creative, Admin, Research, Technical, etc.). 
                  Helps you see if your actual work matches your role. For example, if you're a designer but spend 70% 
                  of your time on Admin, DAR will highlight this imbalance.
                </p>
              </div>

              <div className="p-5 rounded-xl bg-white/70">
                <h4 className="font-semibold text-gray-800 mb-2 flex items-center gap-2">
                  <Heart className="h-5 w-5" style={{ color: COLORS.pink }} />
                  Mood Graph
                </h4>
                <p className="text-sm text-gray-600 leading-relaxed">
                  A line graph showing your mood check-ins throughout the day (🔥 Fired Up, 😊 Good, 😐 Neutral, 🥱 Tired, 😣 Stressed). 
                  Helps you identify mood patterns and correlate them with task types, times of day, or workload. 
                  DAR uses this for behavioral insights, not scoring.
                </p>
              </div>

              <div className="p-5 rounded-xl bg-white/70">
                <h4 className="font-semibold text-gray-800 mb-2 flex items-center gap-2">
                  <BatteryCharging className="h-5 w-5" style={{ color: COLORS.info }} />
                  Energy Wave Graph
                </h4>
                <p className="text-sm text-gray-600 leading-relaxed">
                  A smooth wave graph showing your energy levels throughout the day (High, Medium, Recharging, Low, Drained). 
                  Reveals your natural energy rhythm and helps you schedule work accordingly. DAR highlights your peak energy 
                  window and lowest energy window for optimal task planning.
                </p>
              </div>

              <div className="p-5 rounded-xl bg-white/70">
                <h4 className="font-semibold text-gray-800 mb-2 flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" style={{ color: COLORS.secondary }} />
                  Weekly Comparison Graph
                </h4>
                <p className="text-sm text-gray-600 leading-relaxed">
                  A bar chart comparing this week's metrics to last week (Efficiency, Completion, Focus, Velocity, Momentum, etc.). 
                  Shows % change with color-coded arrows (green = improved, red = declined). Helps you track progress and 
                  identify trends over time.
                </p>
              </div>

              <div className="p-5 rounded-xl bg-white/70">
                <h4 className="font-semibold text-gray-800 mb-2 flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" style={{ color: COLORS.success }} />
                  Monthly Growth Chart
                </h4>
                <p className="text-sm text-gray-600 leading-relaxed">
                  A line chart showing your metric trends over the past 30 days. Reveals long-term patterns and growth. 
                  For example, you might notice your Consistency score steadily increasing, or your Energy score fluctuating 
                  on certain days of the week. Great for spotting seasonal or cyclical patterns.
                </p>
              </div>

            </div>

          </CardContent>
        </Card>

        {/* ⚪ SECTION 9 — STREAKS */}
        <Card className="rounded-[22px] shadow-lg border-0" style={{ backgroundColor: COLORS.softGray }}>
          <CardHeader>
            <CardTitle className="flex items-center gap-3 text-2xl" style={{ color: COLORS.warmText }}>
              <Flame className="h-7 w-7" style={{ color: COLORS.warning }} />
              Streaks — Build Momentum with Daily Consistency
            </CardTitle>
            <CardDescription className="text-base mt-2">
              Streaks reward you for showing up consistently. They count weekdays only, with weekend work earning bonus points.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-gray-700 leading-relaxed">
              Streaks are designed to encourage daily consistency without punishing you for taking weekends off. 
              Here's how they work:
            </p>

            <div className="space-y-4 mt-6">
              
              <div className="p-5 rounded-xl bg-white/70">
                <h4 className="font-semibold text-gray-800 mb-2 flex items-center gap-2">
                  <Calendar className="h-5 w-5" style={{ color: COLORS.primary }} />
                  Weekday Counting
                </h4>
                <p className="text-sm text-gray-600 leading-relaxed">
                  Streaks count <strong>weekdays only</strong> (Monday–Friday). If you work Monday through Friday, you have a 
                  5-day streak. Weekends are excluded from streak counting, so taking Saturday and Sunday off won't break your streak.
                </p>
              </div>

              <div className="p-5 rounded-xl bg-white/70">
                <h4 className="font-semibold text-gray-800 mb-2 flex items-center gap-2">
                  <Trophy className="h-5 w-5" style={{ color: COLORS.accent }} />
                  Weekend Warrior Bonus
                </h4>
                <p className="text-sm text-gray-600 leading-relaxed">
                  If you <strong>do</strong> work on a weekend, you earn a <strong>Weekend Warrior Bonus</strong> (+30 points). 
                  This is a separate streak that doesn't affect your weekday streak. It's a reward for going above and beyond, 
                  not a requirement.
                </p>
              </div>

              <div className="p-5 rounded-xl bg-white/70">
                <h4 className="font-semibold text-gray-800 mb-2 flex items-center gap-2">
                  <AlertCircle className="h-5 w-5" style={{ color: COLORS.warning }} />
                  Streak Resets
                </h4>
                <p className="text-sm text-gray-600 leading-relaxed">
                  Your streak resets <strong>only if you miss a weekday</strong>. For example, if you work Mon-Thu but skip Friday, 
                  your streak resets to 0. Weekends don't count, so missing Saturday/Sunday won't reset your streak.
                </p>
              </div>

              <div className="p-5 rounded-xl bg-gradient-to-r from-yellow-50 to-orange-50">
                <h4 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                  <Award className="h-5 w-5" style={{ color: COLORS.accent }} />
                  Streak Milestones & Bonus Points
                </h4>
                <ul className="text-sm text-gray-700 space-y-2">
                  <li className="flex items-center gap-2">
                    <Flame className="h-4 w-4" style={{ color: COLORS.warning }} />
                    <strong>5-Day Streak:</strong> +50 points
                  </li>
                  <li className="flex items-center gap-2">
                    <Flame className="h-4 w-4" style={{ color: COLORS.warning }} />
                    <strong>10-Day Streak:</strong> +100 points
                  </li>
                  <li className="flex items-center gap-2">
                    <Flame className="h-4 w-4" style={{ color: COLORS.warning }} />
                    <strong>20-Day Streak:</strong> +250 points
                  </li>
                  <li className="flex items-center gap-2">
                    <Flame className="h-4 w-4" style={{ color: COLORS.warning }} />
                    <strong>Monthly Streak (20+ weekdays):</strong> +500 points
                  </li>
                  <li className="flex items-center gap-2">
                    <Star className="h-4 w-4" style={{ color: COLORS.success }} />
                    <strong>Weekend Warrior Bonus:</strong> +30 points per weekend day worked
                  </li>
                </ul>
              </div>

            </div>

            <div className="mt-6 p-6 rounded-xl bg-red-50 border-2 border-red-200">
              <p className="text-sm text-gray-700 flex items-center gap-2">
                <AlertCircle className="h-5 w-5" style={{ color: COLORS.warning }} />
                <strong>Streak at Risk:</strong> If it's a weekday and you haven't clocked in yet, DAR will send you a gentle 
                reminder: "Don't break your 5-day streak! Clock in to keep it going."
              </p>
            </div>

          </CardContent>
        </Card>

        {/* 🟣 SECTION 10 — SHIFT PLANNING */}
        <Card className="rounded-[22px] shadow-lg border-0" style={{ backgroundColor: COLORS.softGray }}>
          <CardHeader>
            <CardTitle className="flex items-center gap-3 text-2xl" style={{ color: COLORS.warmText }}>
              <Clock className="h-7 w-7" style={{ color: COLORS.secondary }} />
              Shift Planning — Set Your Work Duration at Clock-In
            </CardTitle>
            <CardDescription className="text-base mt-2">
              When you clock in, you estimate your shift length. DAR uses this to calculate Utilization and pace your day.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-gray-700 leading-relaxed">
              Shift Planning is a simple but powerful feature. When you click <strong>Clock In</strong>, DAR asks: 
              <span className="font-semibold text-purple-600"> "How long is your shift today?"</span> You select from 
              2h, 3h, 4h, 5h, 6h, 7h, 8h, 9h, 10h, or 12h (or enter a custom duration).
            </p>

            <div className="space-y-4 mt-6">
              
              <div className="p-5 rounded-xl bg-white/70">
                <h4 className="font-semibold text-gray-800 mb-2">How DAR Uses Shift Planning</h4>
                <ul className="text-sm text-gray-600 space-y-2">
                  <li className="flex items-start gap-2">
                    <ArrowRight className="h-4 w-4 mt-0.5" style={{ color: COLORS.primary }} />
                    <span><strong>Utilization Calculation:</strong> Active Time ÷ Planned Shift Time × 100</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <ArrowRight className="h-4 w-4 mt-0.5" style={{ color: COLORS.primary }} />
                    <span><strong>Expected Check-Ins:</strong> Energy every 2h + Mood every 90min (used for survey responsiveness)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <ArrowRight className="h-4 w-4 mt-0.5" style={{ color: COLORS.primary }} />
                    <span><strong>Daily Time Consistency:</strong> Compares today's shift to your weekly average</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <ArrowRight className="h-4 w-4 mt-0.5" style={{ color: COLORS.primary }} />
                    <span><strong>Pacing Notifications:</strong> DAR sends gentle reminders based on your shift length</span>
                  </li>
                </ul>
              </div>

              <div className="p-5 rounded-xl bg-blue-50">
                <h4 className="font-semibold text-gray-800 mb-2">Why It Matters</h4>
                <p className="text-sm text-gray-600 leading-relaxed">
                  Shift Planning helps you set realistic expectations. If you plan a 4-hour shift and work 4 hours, your 
                  Utilization is 100%. If you plan 8 hours but work 5 hours, your Utilization is 62.5% — which tells you 
                  to plan shorter shifts next time. It's about self-awareness, not judgment.
                </p>
              </div>

            </div>
          </CardContent>
        </Card>

        {/* 🟢 SECTION 11 — DAILY TASK GOAL */}
        <Card className="rounded-[22px] shadow-lg border-0" style={{ backgroundColor: COLORS.softGray }}>
          <CardHeader>
            <CardTitle className="flex items-center gap-3 text-2xl" style={{ color: COLORS.warmText }}>
              <Target className="h-7 w-7" style={{ color: COLORS.accent }} />
              Daily Task Goal — Set Your Completion Target
            </CardTitle>
            <CardDescription className="text-base mt-2">
              Optionally set how many tasks you plan to complete today. DAR tracks your progress and rewards you for hitting your goal.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-gray-700 leading-relaxed">
              When you clock in, DAR also asks (optionally): <span className="font-semibold text-purple-600">"How many tasks do you 
              plan to finish today?"</span> This is your <strong>Daily Task Goal</strong>. You can enter any number (e.g., 3, 5, 10).
            </p>

            <div className="space-y-4 mt-6">
              
              <div className="p-5 rounded-xl bg-white/70">
                <h4 className="font-semibold text-gray-800 mb-2">How DAR Uses Your Task Goal</h4>
                <ul className="text-sm text-gray-600 space-y-2">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 mt-0.5" style={{ color: COLORS.success }} />
                    <span><strong>Goal Progress Tracking:</strong> DAR shows "3/5 tasks completed" in real-time</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 mt-0.5" style={{ color: COLORS.success }} />
                    <span><strong>Milestone Alerts:</strong> "You're halfway to your goal!" or "Goal achieved! 🎉"</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 mt-0.5" style={{ color: COLORS.success }} />
                    <span><strong>Momentum Bonus:</strong> Hitting your goal adds to Flow Continuity in Momentum</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 mt-0.5" style={{ color: COLORS.success }} />
                    <span><strong>Consistency Factor:</strong> Meeting your goal regularly improves Consistency score</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 mt-0.5" style={{ color: COLORS.success }} />
                    <span><strong>Point Rewards:</strong> +20 points for meeting goal, +30 points for exceeding it</span>
                  </li>
                </ul>
              </div>

              <div className="p-5 rounded-xl bg-green-50">
                <h4 className="font-semibold text-gray-800 mb-2">Why It Matters</h4>
                <p className="text-sm text-gray-600 leading-relaxed">
                  Setting a Daily Task Goal gives you a clear target and helps you stay focused. It's optional, but users who 
                  set goals tend to have higher Momentum and Consistency scores. DAR uses your goal to provide gentle nudges 
                  like "2 more tasks to hit your goal!" without being pushy.
                </p>
              </div>

            </div>
          </CardContent>
        </Card>

        {/* 🔵 SECTION 12 — RECURRING TASK TEMPLATES */}
        <Card className="rounded-[22px] shadow-lg border-0" style={{ backgroundColor: COLORS.softGray }}>
          <CardHeader>
            <CardTitle className="flex items-center gap-3 text-2xl" style={{ color: COLORS.warmText }}>
              <Repeat className="h-7 w-7" style={{ color: COLORS.pink }} />
              Recurring Task Templates — Save Time on Daily Tasks
            </CardTitle>
            <CardDescription className="text-base mt-2">
              Create templates for tasks you do daily or frequently. They auto-populate into your queue, saving you time and earning you points.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-gray-700 leading-relaxed">
              Recurring Task Templates are a huge time-saver. Instead of typing the same task every day (e.g., "Check emails," 
              "Daily standup," "Review analytics"), you create a <strong>template</strong> once, and DAR adds it to your queue 
              automatically.
            </p>

            <div className="space-y-4 mt-6">
              
              <div className="p-5 rounded-xl bg-white/70">
                <h4 className="font-semibold text-gray-800 mb-2">How Templates Work</h4>
                <ul className="text-sm text-gray-600 space-y-2">
                  <li className="flex items-start gap-2">
                    <ArrowRight className="h-4 w-4 mt-0.5" style={{ color: COLORS.primary }} />
                    <span><strong>Create Once:</strong> Define task name, description, type, category, priority, and goal duration</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <ArrowRight className="h-4 w-4 mt-0.5" style={{ color: COLORS.primary }} />
                    <span><strong>Auto-Populate:</strong> Click "Add to Queue" and the task appears instantly with all pre-filled defaults</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <ArrowRight className="h-4 w-4 mt-0.5" style={{ color: COLORS.primary }} />
                    <span><strong>Edit Anytime:</strong> Templates are flexible — edit or delete them as your routine changes</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <ArrowRight className="h-4 w-4 mt-0.5" style={{ color: COLORS.primary }} />
                    <span><strong>Organized by Priority:</strong> Templates are grouped by priority (Immediate, Daily, Weekly, etc.)</span>
                  </li>
                </ul>
              </div>

              <div className="p-5 rounded-xl bg-white/70">
                <h4 className="font-semibold text-gray-800 mb-2">How Templates Affect Metrics</h4>
                <ul className="text-sm text-gray-600 space-y-2">
                  <li className="flex items-start gap-2">
                    <Zap className="h-4 w-4 mt-0.5" style={{ color: COLORS.warning }} />
                    <span><strong>Momentum:</strong> Using templates speeds up task creation, improving Entry Momentum</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CalendarClock className="h-4 w-4 mt-0.5" style={{ color: COLORS.success }} />
                    <span><strong>Consistency:</strong> Templates create predictable task patterns, boosting Task Mix Stability</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Gauge className="h-4 w-4 mt-0.5" style={{ color: COLORS.secondary }} />
                    <span><strong>Estimation Accuracy:</strong> Pre-set goal durations help you refine estimates over time</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Award className="h-4 w-4 mt-0.5" style={{ color: COLORS.accent }} />
                    <span><strong>Points:</strong> +5 points every time you use a template</span>
                  </li>
                </ul>
              </div>

              <div className="p-5 rounded-xl bg-purple-50">
                <h4 className="font-semibold text-gray-800 mb-2">Admin View</h4>
                <p className="text-sm text-gray-600 leading-relaxed">
                  Admins can see what templates users are creating under each task priority. This helps admins understand 
                  team workflows and identify common tasks that might benefit from automation or process improvements. 
                  Templates are client-specific, so admins can filter by client to see relevant templates.
                </p>
              </div>

            </div>
          </CardContent>
        </Card>

        {/* 🔥 SECTION 13 — FAQ */}
        <Card className="rounded-[22px] shadow-lg border-0" style={{ backgroundColor: COLORS.softGray }}>
          <CardHeader>
            <CardTitle className="flex items-center gap-3 text-2xl" style={{ color: COLORS.warmText }}>
              <HelpCircle className="h-7 w-7" style={{ color: COLORS.info }} />
              Frequently Asked Questions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Accordion type="single" collapsible className="w-full">
              
              <AccordionItem value="item-1">
                <AccordionTrigger className="text-left">
                  How often do metrics update?
                </AccordionTrigger>
                <AccordionContent className="text-gray-600">
                  All metrics update in real-time as you work. Every time you start, pause, resume, or complete a task, 
                  the dashboard recalculates your scores. Mood and energy check-ins also trigger immediate updates. 
                  You'll see changes within seconds.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-2">
                <AccordionTrigger className="text-left">
                  Can I see other users' data?
                </AccordionTrigger>
                <AccordionContent className="text-gray-600">
                  No. Regular users can only see their own data. Admins can view team metrics in aggregate (e.g., average 
                  Efficiency across the team) and individual user dashboards for coaching purposes, but all data is private 
                  by default. Your work patterns are yours alone.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-3">
                <AccordionTrigger className="text-left">
                  What happens if I miss a mood or energy check-in?
                </AccordionTrigger>
                <AccordionContent className="text-gray-600">
                  <p className="mb-3">
                    Surveys appear every <strong>30 minutes</strong> while you're clocked in, and auto-dismiss after <strong>30 seconds</strong> 
                    if not answered. Every survey is logged — both answered and missed.
                  </p>
                  <p className="mb-3">
                    <strong>Points:</strong> Answered surveys earn <strong>+2 points</strong>. Missed surveys earn <strong>0 points</strong>.
                  </p>
                  <p className="mb-3">
                    <strong>Engagement Penalty:</strong> If you miss <strong>50% or more</strong> of your surveys in a day, 
                    a fair penalty is applied to three metrics:
                  </p>
                  <ul className="list-disc ml-6 mb-3 space-y-1">
                    <li><strong>Energy:</strong> -25% reduction</li>
                    <li><strong>Consistency:</strong> -15% reduction</li>
                    <li><strong>Momentum:</strong> -10% reduction</li>
                  </ul>
                  <p>
                    This encourages engagement without being harsh. The penalty is non-invasive — it only affects these three metrics 
                    and only when you miss half or more of your surveys. Notifications in your bell will show "Survey missed" events 
                    so you can track your responsiveness.
                  </p>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-4">
                <AccordionTrigger className="text-left">
                  How does DAR handle long tasks that take multiple days?
                </AccordionTrigger>
                <AccordionContent className="text-gray-600">
                  DAR is designed for single-session tasks. If a task spans multiple days, we recommend breaking it into 
                  smaller sub-tasks (e.g., "Project X - Day 1," "Project X - Day 2"). This gives you better insights into 
                  daily progress and prevents one massive task from skewing your metrics.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-5">
                <AccordionTrigger className="text-left">
                  Can I edit a task after I've started it?
                </AccordionTrigger>
                <AccordionContent className="text-gray-600">
                  Yes! You can edit the task description, priority, category, and goal duration at any time during the task. 
                  However, Task Type and Intent cannot be changed once the task is started (to preserve metric accuracy). 
                  If you need to change Task Type, complete the current task and start a new one.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-6">
                <AccordionTrigger className="text-left">
                  What's the difference between Efficiency and Utilization?
                </AccordionTrigger>
                <AccordionContent className="text-gray-600">
                  <strong>Efficiency</strong> measures active time vs clocked-in time (how well you use your actual work hours). 
                  <strong>Utilization</strong> measures active time vs planned shift time (how well you use your estimated shift). 
                  Efficiency is about minimizing idle time; Utilization is about planning accuracy. Both are important but measure 
                  different things.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-7">
                <AccordionTrigger className="text-left">
                  Why does my Focus Index drop when I pause a task?
                </AccordionTrigger>
                <AccordionContent className="text-gray-600">
                  Focus Index is based on allowed pauses for your task type. If you exceed the allowed pauses (e.g., 2 pauses 
                  for a Deep Work task), your Focus score drops by 20% per excess pause. This isn't a punishment — it's feedback 
                  that helps you understand your concentration patterns. Some tasks naturally require more pauses, which is why 
                  Task Type matters.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-8">
                <AccordionTrigger className="text-left">
                  How are points calculated and what can I do with them?
                </AccordionTrigger>
                <AccordionContent className="text-gray-600">
                  Points are earned for completing tasks, meeting goals, maintaining streaks, answering check-ins, and achieving 
                  high metric scores. Points are saved daily, weekly, monthly, and lifetime. Currently, points are for tracking 
                  and motivation. <strong>Coming soon:</strong> A Rewards Store where you can redeem points for perks, badges, 
                  custom themes, and other goodies!
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-9">
                <AccordionTrigger className="text-left">
                  Can I customize which metrics appear on my dashboard?
                </AccordionTrigger>
                <AccordionContent className="text-gray-600">
                  Not yet, but this feature is coming soon! In the future, you'll be able to pin your favorite metrics, 
                  hide metrics you don't care about, and rearrange the dashboard layout. For now, all 10 metrics are displayed 
                  by default.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-10">
                <AccordionTrigger className="text-left">
                  What if I disagree with a behavioral insight?
                </AccordionTrigger>
                <AccordionContent className="text-gray-600">
                  Insights are AI-generated based on patterns in your data. They're meant to be supportive, not prescriptive. 
                  If an insight doesn't resonate with you, feel free to ignore it. Over time, as DAR learns more about your 
                  work style, insights become more accurate. You can also provide feedback on insights (coming soon) to help 
                  improve the AI.
                </AccordionContent>
              </AccordionItem>

            </Accordion>
          </CardContent>
        </Card>

        {/* FOOTER */}
        <div className="text-center py-8 space-y-4">
          <Separator className="my-8" />
          <p className="text-gray-600 text-sm">
            Smart DAR Dashboard is designed to help you work smarter, not harder. 
            All metrics are fair, supportive, and designed with your well-being in mind.
          </p>
          <p className="text-gray-500 text-xs">
            Questions? Feedback? Reach out to your admin or check the Help Center.
          </p>
          <div className="flex items-center justify-center gap-2 mt-4">
            <Coffee className="h-5 w-5" style={{ color: COLORS.accent }} />
            <span className="text-sm text-gray-600">Made with care for your productivity journey</span>
          </div>
        </div>

      </div>
    </div>
  );
};

export default SmartDARHowItWorks;
