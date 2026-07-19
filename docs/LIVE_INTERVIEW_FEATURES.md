# Live AI Interview Features

## Overview

The platform now includes a **fully automated AI-powered live interview** with real-time proctoring and cheating detection.

---

## Features

### 1. **Live Video Interview Mode**
- AI avatar asks questions via text-to-speech
- User answers via voice (recorded)
- Real-time transcription via Whisper
- Instant AI feedback after each answer

### 2. **Cheating Detection (Proctoring)**

| Detection Type | Description | Action |
|----------------|-------------|--------|
| **Face Detection** | Tracks if face is visible in webcam | Warning if no face detected for >5s |
| **Multiple Faces** | Detects if >1 person in frame | Immediate warning |
| **Looking Away** | Uses face landmarks to detect gaze direction | Warning if looking away >5s |
| **Tab Switching** | Detects when user switches to another tab/window | Instant warning logged |
| **Window Blur** | Detects when browser loses focus | Warning logged |

All violations are:
- ✅ Logged with timestamp
- ✅ Displayed in real-time to user
- ✅ Counted (shown as badge)
- ✅ Saved to interview session report
- ⚠️ Flagged in final report for review

### 3. **Video Recording**
- Records entire interview session (webcam + audio)
- Saved locally as `.webm` file
- Can be downloaded after interview
- Duration: entire session length
- Future: Upload to server for admin review

### 4. **AI Interviewer Experience**
- Questions read aloud via browser text-to-speech
- Animated AI avatar (visual indicator)
- User webcam shown in small overlay (picture-in-picture)
- Real-time status indicators

### 5. **Proctoring Dashboard (Sidebar)**
Shows live status:
- ✓ Face Detected
- ✓ Looking at Screen
- ✓ Single Person
- ✓ Tab Switches Count
- ✓ Total Warnings

---

## How It Works

### User Flow

1. **Setup**
   - User selects category, difficulty, type
   - Chooses between:
     - **Live AI Interview** (with video monitoring) ← Recommended
     - **Text/Audio Only** (basic mode)

2. **Pre-Interview Screen**
   - Webcam permission request
   - Instructions shown
   - User clicks "Start Interview"

3. **Interview Session**
   - Webcam starts recording
   - AI speaks first question via text-to-speech
   - User records voice answer
   - AI transcribes + evaluates
   - Feedback shown instantly
   - Next question

4. **Proctoring (Background)**
   - Face detection runs every 1 second
   - Tab/window visibility tracked continuously
   - All violations logged with timestamps

5. **Completion**
   - Video recording saved
   - All warnings compiled into report
   - Redirect to results page with:
     - Performance scores
     - Cheating log
     - Option to download video

---

## Technical Implementation

### Face Detection
- **Library**: `face-api.js` (TensorFlow.js based)
- **Models Used**:
  - `tinyFaceDetector` (lightweight, fast)
  - `faceLandmark68TinyNet` (eye/nose landmarks)
- **Detection Frequency**: Every 1 second
- **CDN**: Models loaded from `@vladmandic/face-api` CDN

### Cheating Detection Logic
```javascript
// No face for >5 seconds → Warning
// Multiple faces → Immediate warning
// Gaze deviation >15% from center → Looking away warning
// document.hidden === true → Tab switch warning
// window.blur event → Window lost focus warning
```

### Video Recording
- **API**: `MediaRecorder` (native browser API)
- **Codec**: WebM (VP8/VP9) with Opus audio
- **Bitrate**: 1 Mbps
- **Data Collection**: Every 1 second chunks

---

## Routes

| Route | Description |
|-------|-------------|
| `/interview` | Setup page — choose mode |
| `/interview/live/:sessionId` | Live AI interview with proctoring |
| `/interview/session/:sessionId` | Basic text/audio interview |
| `/interview/result/:sessionId` | Results + cheating report |

---

## Admin View of Cheating Log

In the final report, admins will see:

```
Interview Report: John Doe
Session: Software Engineering - Medium - Technical
Duration: 15:23

Proctoring Report:
------------------
Total Warnings: 7

[00:03:12] TAB_SWITCH - Switched to another tab/window
[00:05:45] NO_FACE - No face detected in camera
[00:07:30] LOOKING_AWAY - Looking away from screen detected
[00:10:15] TAB_SWITCH - Switched to another tab/window
[00:12:40] MULTIPLE_FACES - 2 faces detected - possible cheating
[00:14:05] TAB_SWITCH - Switched to another tab/window
[00:15:00] WINDOW_BLUR - Window lost focus

Risk Level: HIGH (7 violations)
Recommendation: Manual review required
```

---

## Browser Compatibility

| Feature | Chrome | Firefox | Safari | Edge |
|---------|--------|---------|--------|------|
| Webcam Access | ✅ | ✅ | ✅ | ✅ |
| MediaRecorder | ✅ | ✅ | ✅ | ✅ |
| Face Detection | ✅ | ✅ | ⚠️ Slower | ✅ |
| Text-to-Speech | ✅ | ✅ | ✅ | ✅ |
| Tab Detection | ✅ | ✅ | ✅ | ✅ |

⚠️ Safari has limited TensorFlow.js support — face detection may be slower

---

## User Privacy

- ✅ Webcam permission requested explicitly
- ✅ User can decline (falls back to basic mode)
- ✅ Video stored locally on user's device
- ✅ Clear notice that interview is monitored
- ✅ No tracking outside interview session
- ⚠️ Video upload to server is optional (not implemented yet)

---

## Installation

No additional backend setup needed. Frontend only:

```bash
cd frontend
npm install face-api.js
npm run dev
```

The face detection models (~6MB total) are loaded from CDN on first use.

---

## Future Enhancements

1. **Upload video to backend** after interview
2. **Admin video playback** with timestamp navigation to violations
3. **Screen recording** (desktop capture) in addition to webcam
4. **Eye tracking** precision improvements
5. **Mobile device detection** (block if not desktop)
6. **Keyboard/mouse activity** monitoring
7. **Audio analysis** (detect multiple voices)

---

## Demo

**Live Interview Mode**:
- User sees AI avatar
- Questions spoken aloud
- Real-time proctoring sidebar
- Warnings appear as toasts + logged
- Recording indicator active

**Basic Interview Mode**:
- Text + audio only
- No webcam required
- No cheating detection
- Faster/lighter experience
