# 🔍 Firebase Analytics Debug Guide

## 🚨 Issues You're Experiencing
1. **No active users showing in Firebase Console**
2. **Console debugging needed**
3. **Analytics events not appearing**

## ✅ What I've Fixed

### 1. **Added Comprehensive Debug Logging**
- Created `src/utils/DebugLogger.ts` for detailed Firebase Analytics logging
- Added debug messages throughout the app initialization
- Console will now show detailed Firebase status and events

### 2. **Enhanced User Activity Tracking**
- Added `user_engagement` events with minimum 5-second engagement time
- Added proper screen view tracking for HomeScreen
- Set user properties including platform, app version, and first open time
- Added unique user ID generation and storage

### 3. **Fixed Active User Tracking**
- Added `app_open` event logging on app start
- Added `session_start` events with engagement time
- Added user engagement events that count toward active users
- Set proper user properties for better user identification

## 🔧 How to Debug

### **Step 1: Run Debug Mode**
```bash
# Enable Firebase debug logging
npm run firebase-debug

# Run app in debug mode with console monitoring
npm run debug
```

### **Step 2: Open DevTools Console**
1. Run your app: `npx react-native run-android --variant=debug`
2. In the Metro terminal, press `d` to open developer menu
3. Select **"Debug JS Remotely"** or **"Open DevTools"**
4. Go to `chrome://inspect/#devices` in Chrome
5. Click **"inspect"** under your app

### **Step 3: Monitor Console Messages**
Look for these debug messages in the Chrome DevTools console:

#### ✅ **Success Messages:**
```
🔥 Firebase Analytics Enabled: true
🆔 App Instance ID: [some-unique-id]  
✅ Firebase Analytics debug event sent
📊 App open event logged to Firebase
👤 User properties set for analytics
🌊 HomeScreen loaded with analytics tracking
```

#### ❌ **Error Messages:**
```
❌ Firebase Analytics Debug Error: [error details]
⚠️ Firebase Analytics initialization failed: [error message]
```

### **Step 4: Enable Firebase DebugView**
```bash
# Enable debug mode for your specific app
adb shell setprop debug.firebase.analytics.app com.brainbitescabby.app

# Then check Firebase Console → DebugView
```

### **Step 5: Check Firebase Console**
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: **brainbites-analytics**
3. Go to **Analytics → DebugView** (for real-time debug events)
4. Go to **Analytics → Events** (for historical data)

## 🎯 What Each Debug Event Does

| Event | Purpose | Active User Impact |
|-------|---------|-------------------|
| `app_open` | Logs app launch | ✅ Counts toward active users |
| `user_engagement` | 5+ second engagement | ✅ Counts toward active users |
| `screen_view` | Screen navigation | ✅ Counts toward active users |
| `session_start` | App session begins | ✅ Counts toward active users |
| `home_screen_opened` | Custom debug event | ✅ Shows user activity |

## ⏰ Timeline Expectations

### **Immediate (Real-time):**
- Debug events appear in **DebugView** instantly
- Console logging shows Firebase status immediately
- Events sent to Firebase in real-time

### **24-48 Hours:**
- **Active Users** metrics appear in Firebase Console
- **Audience** data becomes available
- **Retention** reports start showing data

### **7+ Days:**
- Full analytics dashboard populated
- Cohort analysis available
- Detailed user journey data

## 🔍 Troubleshooting

### **Problem: No Console Messages**
```bash
# Check if app is in debug mode
adb shell getprop debug.firebase.analytics.app

# Should return: com.brainbitescabby.app
```

### **Problem: Firebase Not Initialized**
- Check `android/app/google-services.json` exists
- Verify package name matches: `com.brainbitescabby.app`
- Ensure Firebase project is active

### **Problem: No Active Users After 48 Hours**
- Verify events are being sent (check DebugView)
- Confirm `user_engagement` events have `engagement_time_msec` >= 1000
- Check that `app_open` events are being logged

## 🚀 Next Steps

1. **Run the debug mode**: `npm run debug`
2. **Open Chrome DevTools** and monitor console
3. **Enable DebugView**: `npm run firebase-debug`
4. **Use the app for 2-3 minutes** (navigate screens, answer questions)
5. **Check Firebase DebugView** for real-time events
6. **Wait 24-48 hours** for active users to appear

## 📊 Key Debug Commands

```bash
# Start debug session
npm run debug

# Enable Firebase debug logging
npm run firebase-debug  

# Check debug property
adb shell getprop debug.firebase.analytics.app

# View console in Chrome
chrome://inspect/#devices
```

Your app now has comprehensive debug logging and proper active user tracking! 🎉