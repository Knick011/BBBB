BrainBites – Work Log & TODOs

Current Version

- versionID: 10
- versionName: 10

Summary of recent changes

- Carryover fallback: If the native DailyScoreCarryover does not supply a value, EnhancedScoreService now applies a JS fallback using the end‑of‑day net seconds written by HybridTimerService at `@BrainBites:scoreDelta`.
  - Mapping: positive net → +10 pts per minute; negative net (overtime) → −5 pts per minute.
  - Applied once per day, persisted, and the `@BrainBites:scoreDelta` key is cleared. Toast shown if available. Logs added.

- 6‑hour responsibility reminder (hybrid):
  - On background: we store `@BrainBites:lastBackgroundTs` and schedule a native one‑time reminder (+6h) via `NotificationService`.
  - On app active: if ≥6h elapsed, we immediately unlock the responsibility check‑in and post a local fallback notification. This ensures delivery even if the app was closed/crashed.

- Daily notifications content and scheduling:
  - Morning Daily Goal reminder (~07:30):
    - Title: "🌅 Start Strong: Complete a Daily Goal"
    - Skipped if a regular daily goal has already been completed today (daily streak day recorded).
    - On completion of a regular daily goal, any pending `daily_goals_morning` schedule is canceled.
  - Leaderboard nudges (midday ~12:00, evening ~18:30):
    - Midday: "📈 Midday Momentum" – "Quick score push moves your rank up. Jump in when ready."
    - Evening: "🏁 Evening Push" – "One last score boost can secure your spot on the leaderboard."
  - `NotificationService.ensureDailySchedules()` creates these once per local day and is invoked during initialization and on app resume.
  - Uses native scheduling if available; otherwise, stores fallback one‑time schedules and delivers on next resume if due.

Files touched

- `src/services/EnhancedScoreService.ts` – added JS carryover fallback.
- `App.tsx` – hybrid 6h comeback (persist timestamp; check on resume; fallback notify) and ensure daily schedules on resume.
- `src/services/NotificationService.ts` – added `ensureDailySchedules()`, morning goal scheduling, leaderboard nudges, skip logic if daily goal done.
- `src/services/DailyGoalsService.ts` – on first regular daily goal completion, cancels the morning goal reminder.

How to test on Android emulator (AVD)

1) Morning Daily Goal reminder skip
   - Set device time ~06:55; complete a regular daily goal before 07:30.
   - Advance time past 07:30 → no morning reminder should appear.
   - Control: fresh day with no goal completed before 07:30 should show the reminder.

2) Leaderboard nudges
   - Fresh day, open app near 11:50 → background → set time to ~12:01 → expect "📈 Midday Momentum".
   - Repeat for ~18:30 → expect "🏁 Evening Push".

3) Responsibility 6h reminder
   - Background app; increase time by +6h → expect native reminder.
   - If not fired, foreground app → resume check should post fallback notification immediately.

4) Carryover fallback
   - Simulate overtime at end of day (negative net). Bump device date +1.
   - Launch app → verify starting daily score shows negative penalty and logs mention JS fallback.

adb logcat filters

- `adb logcat | grep -i "BrainBites\|NotificationService\|DailyGoals\|HybridTimer\|EnhancedScore"`

Next steps (proposed)

- Add quiet hours enforcement (e.g., avoid 22:00–07:00; auto‑shift schedules if needed).
- Add user preferences for reminder times and per‑channel toggles (Reminders vs Achievements).
- Add re‑engagement (1/3/7‑day inactivity) using the same native‑first scheduling.
- Optional debug screen to list “today’s scheduled notifications” and native module availability.
- Validate native modules presence at runtime and surface a single consolidated status log (NotificationModule, BrainBitesTimer, ScreenTimeModule, DailyScoreCarryover).
- Final policy pass (no exact alarms, honest foreground notifications, consent respected, no ads in notifications).

Notes

- Current default times: Morning 07:30, Midday 12:00, Evening 18:30.
- Morning reminder is strictly daily‑goal oriented; midday/evening are score/leaderboard only.
- Responsibility reminder uses native one‑time + resume‑time fallback to remain reliable even if the app is closed or crashes.
