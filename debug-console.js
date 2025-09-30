// debug-console.js - Console monitoring script
// Run this with: node debug-console.js
// Or add it as an npm script

console.log('🔍 BrainBites Debug Console Monitor');
console.log('===================================');

// Instructions for debugging
console.log('📱 To debug your React Native app:');
console.log('');
console.log('1. Run your app in debug mode:');
console.log('   npx react-native run-android --variant=debug');
console.log('');
console.log('2. Open Metro DevTools:');
console.log('   - In your terminal, press "d" to open developer menu on device');
console.log('   - Select "Debug JS Remotely" or "Open DevTools"');
console.log('');
console.log('3. Open Chrome DevTools:');
console.log('   - Go to chrome://inspect/#devices');
console.log('   - Click "inspect" under your app');
console.log('');
console.log('4. Check Firebase Analytics in console:');
console.log('   - Look for messages starting with 🔍, 📊, ✅, ❌');
console.log('   - Check Firebase Analytics debug events');
console.log('');
console.log('5. Monitor active users:');
console.log('   - Firebase Console → Analytics → Events');
console.log('   - Look for user_engagement, screen_view, app_open events');
console.log('   - Active users should appear within 24-48 hours');
console.log('');
console.log('🎯 Key Debug Messages to Look For:');
console.log('  ✅ Firebase Analytics initialized successfully');
console.log('  📊 App open event logged to Firebase');
console.log('  🆔 App Instance ID: [some-id]');
console.log('  👤 User properties set for analytics');
console.log('  🌊 HomeScreen loaded with analytics tracking');
console.log('');
console.log('❌ Common Issues:');
console.log('  - "Firebase Analytics debug event sent" should appear');
console.log('  - If no Firebase messages, check google-services.json');
console.log('  - Active users show up in Firebase Console after 24-48 hours');
console.log('  - Debug events appear immediately in DebugView');
console.log('');
console.log('🔧 Enable Firebase DebugView:');
console.log('  adb shell setprop debug.firebase.analytics.app com.brainbitescabby.app');
console.log('  Then check Firebase Console → DebugView');
console.log('');
console.log('Monitor this console for real-time debug information...');
console.log('===================================');