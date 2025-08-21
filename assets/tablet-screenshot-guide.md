# Tablet Screenshot Creation Guide for BrainBites

## Method 1: Android Studio AVD Manager (Recommended)

### Create 7-inch Tablet Emulator:
```bash
# In Android Studio:
1. Tools → AVD Manager → Create Virtual Device
2. Category: Tablet
3. Select "Nexus 7" (7.02", 1200 x 1920, 323 dpi)
4. System Image: API 33 (Android 13)
5. Name: "BrainBites_7inch"
```

### Create 10-inch Tablet Emulator:
```bash
# In Android Studio:
1. Tools → AVD Manager → Create Virtual Device  
2. Category: Tablet
3. Select "Pixel C" (10.2", 2560 x 1800, 308 dpi)
4. System Image: API 33 (Android 13)
5. Name: "BrainBites_10inch"
```

## Method 2: Browser Simulation (Quick Alternative)

### For 7-inch Tablet:
1. Open Chrome DevTools (F12)
2. Toggle device toolbar
3. Add custom device:
   - Name: "7-inch Tablet"
   - Width: 1024px
   - Height: 600px
   - DPR: 2

### For 10-inch Tablet:
1. Open Chrome DevTools (F12)
2. Add custom device:
   - Name: "10-inch Tablet"  
   - Width: 1280px
   - Height: 800px
   - DPR: 2

## Screenshots to Take (Both 7" and 10"):

1. **Home Screen** - Show mascot, daily goals, quiz buttons
2. **Quiz in Progress** - Active question with timer
3. **Results Screen** - Score display and celebration
4. **Daily Goals** - Progress tracking and timer
5. **Settings Screen** - Show notification and audio settings

## Play Store Requirements:
- **7-inch**: At least 1 screenshot
- **10-inch**: At least 1 screenshot  
- **Format**: PNG or JPG
- **Max size**: 8MB each
- **Show actual app content** (no mockups)

## Tips:
- Use landscape orientation for tablets
- Capture your best app screens
- Show key features prominently
- Ensure screenshots are crisp and clear