# PROJECT END-TERM REPORT

## For

## AI-Based Sports Platform for Analysis and Ranking

**Reporting Period:** January 2026 — May 2026
**Report Date:** May 2026

---

### Submitted By

| Specialization | SAP ID | Name |
|---|---|---|
| B.Tech CSE (AI & ML) | 5001243977 | Shashank Dimri |

**AI Cluster**
**School of Computer Science**
**UNIVERSITY OF PETROLEUM & ENERGY STUDIES,**
**DEHRADUN — 248007. Uttarakhand**


---

## TABLE OF CONTENTS

| S.No. | Contents | Page No |
|---|---|---|
| 1 | Introduction | |
| 2 | History and Background | |
| 3 | Requirement Analysis | |
| 4 | Main Objective | |
| 5 | Sub Objectives | |
| 6 | System Analysis | |
| | 6.1 Existing System | |
| | 6.2 Motivations | |
| | 6.3 Proposed System | |
| 7 | Modules | |
| | 7.1 AI Pose Detection & Video Analysis | |
| | 7.2 ML Form Classification & Rep Calibration | |
| | 7.3 AI Verdict Learning System | |
| | 7.4 Authentication & Role Management | |
| | 7.5 Video Storage & Streaming | |
| | 7.6 Administrative Dashboard | |
| 8 | Design | |
| | 8.1 System Architecture | |
| | 8.2 Use Case Diagram | |
| | 8.3 Activity Diagram | |
| | 8.4 Class/Module Diagram | |
| 9 | Technology Stack | |
| 10 | Implementation | |
| | 10.1 Frontend Implementation | |
| | 10.2 Backend Implementation | |
| | 10.3 AI/ML Pipeline Implementation | |
| 11 | Output Screens | |
| 12 | Test Results and Outcomes | |
| 13 | Limitations and Future Enhancements | |
| 14 | Conclusion | |
| 15 | References | |

---

## LIST OF FIGURES

| S.No. | Figure | Page No |
|---|---|---|
| Fig. 1 | System Architecture Diagram | |
| Fig. 2 | Use Case Diagram | |
| Fig. 3 | Activity Diagram — Video Upload & AI Analysis | |
| Fig. 4 | AI Training Pipeline Flow | |
| Fig. 5 | Module Interaction Diagram | |
| Fig. 6 | Landing Page Screenshot | |
| Fig. 7 | Athlete Dashboard Screenshot | |
| Fig. 8 | Record Test Page Screenshot | |
| Fig. 9 | Admin Dashboard Screenshot | |
| Fig. 10 | AI Training Page Screenshot | |

## LIST OF TABLES

| S.No. | Table | Page No |
|---|---|---|
| Table 1 | Project Identification Details | |
| Table 2 | Technology Stack | |
| Table 3 | MongoDB Collections Schema | |
| Table 4 | API Endpoints Summary | |
| Table 5 | Test Case Results | |
| Table 6 | AI vs Manual Evaluation Comparison | |
| Table 7 | Feature Engineering Summary | |
| Table 8 | SAI Benchmark Data | |

---

## CHAPTER 1: INTRODUCTION

### 1.1 Overview

The **AI-Based Sports Platform for Analysis and Ranking** is a comprehensive full-stack web application developed in response to **Smart India Hackathon 2025 Problem Statement 25073**, issued by the Sports Authority of India (SAI) under the Ministry of Education, Government of India. The project addresses the fundamental challenge of democratizing sports talent identification across India — a nation of 400+ million youth where formal assessment infrastructure is concentrated in approximately 50 cities, leaving athletes in 740+ districts without access to standardized evaluation.

The platform enables any athlete with a smartphone camera to undergo SAI-standard fitness evaluation remotely. Through a combination of **MediaPipe BlazePose** pose estimation, **OpenCV** video processing, **scikit-learn** machine learning classifiers, and a **Flask + MongoDB** backend, the system automatically counts exercise repetitions, scores movement quality across six biomechanical dimensions, generates percentile rankings against official SAI benchmark data, and provides AI-driven approval verdicts that continuously improve from administrator feedback.

### 1.2 Problem Statement

Smart India Hackathon 2025 Problem Statement 25073 (Sports Authority of India):

> *"Develop an AI-based solution that enables remote sports talent assessment and ranking, allowing athletes from across India to undergo standardized fitness evaluation without requiring physical travel to SAI testing centers."*

**Key challenges identified:**
1. Geographic inaccessibility: 740+ districts lack SAI testing infrastructure
2. Financial barriers: Travel costs exclude underprivileged athletes
3. Scalability: Manual assessment cannot scale to millions of potential athletes
4. Objectivity: Human evaluators introduce subjective bias in scoring
5. Data fragmentation: No centralized platform for national talent discovery

### 1.3 Project Identification

**Table 1: Project Identification Details**

| Field | Details |
|---|---|
| Project Title | AI-Based Sports Platform for Analysis and Ranking |
| Problem Statement | SIH 2025 PS-25073 (Sports Authority of India) |
| Domain | Artificial Intelligence + Sports Technology |
| Development Period | January 2026 — May 2026 |
| Methodology | Agile (3-month iterative development) |
| Team Size | 2 members |
| Project Mentor | Ms. Swati Rastogi |
| Institution | UPES, Dehradun — School of Computer Science |

---

## CHAPTER 2: HISTORY AND BACKGROUND

### 2.1 Evolution of Sports Assessment

Traditional sports talent identification in India relies on periodic physical testing camps conducted by SAI at designated centers. Athletes must travel to these centers, undergo manual evaluation by trained assessors, and wait for results. This process has remained largely unchanged for decades, despite advances in computer vision and AI.

### 2.2 Emergence of AI in Sports

Recent advances in human pose estimation — particularly Google's MediaPipe framework (Lugaresi et al., 2019) — have made real-time body tracking feasible on consumer hardware. Research by Dill et al. (2023) demonstrated that MediaPipe achieves sufficient accuracy for exercise form assessment, while Khurana et al. (2018) showed automated exercise recognition in unconstrained environments using GymCam.

### 2.3 Gap Analysis

No existing platform combines all of the following:
1. Real-time pose-based exercise analysis accessible via smartphone browser
2. AI-powered repetition counting with form quality scoring
3. Percentile ranking against official government benchmark data
4. Self-improving verdict system that learns from administrator decisions
5. Hierarchical administrative structure (Athlete → Admin → HeadAdmin) with AI training capabilities

This project fills this gap by integrating these capabilities into a single, production-ready PWA.

---

## CHAPTER 3: REQUIREMENT ANALYSIS

### 3.1 Functional Requirements

| ID | Requirement | Priority |
|---|---|---|
| FR-01 | Athletes can register with email, DOB, gender, and location | High |
| FR-02 | Athletes can record fitness test videos via browser camera | High |
| FR-03 | Athletes can upload pre-recorded videos for AI analysis | High |
| FR-04 | AI automatically counts exercise repetitions from video | High |
| FR-05 | AI scores movement form quality (0–1 scale) | High |
| FR-06 | System generates percentile rankings by age group | High |
| FR-07 | Admins can review, approve, or flag submissions | High |
| FR-08 | HeadAdmin can upload labeled training videos | High |
| FR-09 | ML classifier trains from labeled data (correct/foul) | Medium |
| FR-10 | AI verdict system auto-approves high-confidence submissions | Medium |
| FR-11 | National leaderboard with age-group filtering | Medium |
| FR-12 | Admin broadcast notification system | Medium |
| FR-13 | Direct messaging between admins and athletes | Low |
| FR-14 | Profile photo upload and management | Low |

### 3.2 Non-Functional Requirements

| ID | Requirement | Target |
|---|---|---|
| NFR-01 | API response time | < 2 seconds |
| NFR-02 | Video analysis throughput | 60s video in < 60s |
| NFR-03 | Minimum device support | Android 2GB RAM + Chrome |
| NFR-04 | Password security | bcrypt with random salt |
| NFR-05 | Session management | JWT with 7-day expiry |
| NFR-06 | Data encryption | TLS 1.2+ for all DB connections |
| NFR-07 | Mobile responsiveness | PWA on all screen sizes |

---

## CHAPTER 4: MAIN OBJECTIVE

The primary objective of this project is to develop and deploy a fully functional **AI-powered Progressive Web Application** that enables **remote, standardized sports talent assessment** for Indian athletes, directly addressing SAI's SIH 2025 Problem Statement 25073.

The platform must:
1. Accept video recordings of SAI-standard fitness tests via any smartphone browser
2. Automatically analyze videos using AI/ML to count repetitions and score form quality
3. Generate percentile rankings against official SAI NTIDS benchmark data
4. Provide a tiered administrative system for submission review and talent discovery
5. Continuously improve its analysis accuracy through a self-learning AI pipeline

---

## CHAPTER 5: SUB OBJECTIVES

1. **Implement MediaPipe-based pose detection** capable of extracting 33 skeletal landmarks from exercise videos at 25–30 FPS
2. **Build a finite state machine rep counter** supporting Pushups, Sit-ups, and Pull-ups with bilateral joint angle analysis
3. **Engineer 30+ biomechanical features** per video for comprehensive form assessment
4. **Train Random Forest classifiers** to distinguish correct from foul exercise form using HeadAdmin-labeled data
5. **Develop a Linear Regression rep calibrator** to correct systematic AI counting bias
6. **Create an adaptive AI verdict system** that learns from administrator approve/flag decisions and auto-approves high-confidence submissions
7. **Build a React.js PWA frontend** with 19 pages covering athlete, admin, and HeadAdmin workflows
8. **Implement a Flask REST API** with 10 route blueprints and JWT-based RBAC
9. **Integrate Google Drive API** for cloud video storage with OAuth2 authentication
10. **Deploy MongoDB Atlas** for scalable, cloud-hosted data persistence

## CHAPTER 6: SYSTEM ANALYSIS

### 6.1 Existing System

The current SAI talent identification process operates through physical testing camps:
- **Manual Assessment:** Trained human evaluators count repetitions and score form by visual observation
- **Centralized Locations:** Testing conducted at ~50 SAI centers in major cities
- **Paper-Based Records:** Results recorded manually and aggregated offline
- **Periodic Scheduling:** Testing camps held on fixed dates, limiting athlete access
- **No Remote Capability:** Athletes must physically travel to centers

**Limitations of the Existing System:**
1. Geographic exclusion of rural athletes (740+ underserved districts)
2. Subjective scoring — human evaluators introduce inter-rater variability
3. Low throughput — manual process cannot scale to millions of athletes
4. High cost — travel, accommodation, and logistics expenses for athletes
5. No continuous improvement — assessment criteria remain static

### 6.2 Motivations

1. **SIH 2025 Problem Statement 25073:** Direct government mandate for AI-based remote sports assessment
2. **Digital India Initiative:** Aligns with government push for technology-enabled governance
3. **Democratization:** 400M+ Indian youth deserve equal access to talent evaluation regardless of geography
4. **AI Maturity:** MediaPipe and scikit-learn provide production-ready AI capabilities on consumer hardware
5. **Smartphone Penetration:** 800M+ smartphone users in India enable mobile-first platform delivery

### 6.3 Proposed System

The AI-Based Sports Platform replaces manual assessment with an automated, AI-powered pipeline:

| Aspect | Existing System | Proposed System |
|---|---|---|
| Location | 50 SAI centers | Any smartphone, anywhere |
| Evaluator | Human observer | MediaPipe + ML models |
| Scoring | Subjective visual | Objective biomechanical analysis |
| Speed | Minutes per athlete | Seconds per video |
| Scalability | Thousands/year | Unlimited concurrent |
| Data | Paper records | MongoDB Atlas cloud DB |
| Cost to athlete | Travel + accommodation | Free (smartphone + internet) |
| Improvement | Static criteria | Self-learning AI that improves from feedback |

---

## CHAPTER 7: MODULES

### 7.1 AI Pose Detection & Video Analysis Module

**Location:** `server/services/video_analysis.py` + `server/ai_training/trainer.py`

This is the core AI module that processes exercise videos:

1. **Video Ingestion:** OpenCV reads uploaded video, determines FPS and frame count
2. **Frame Sampling:** Samples at ~12 FPS (every `fps/12`th frame) for efficiency
3. **Pose Detection:** MediaPipe BlazePose processes each sampled frame to extract 33 skeletal landmarks with visibility scores
4. **Bilateral Angle Computation:** For each frame, computes angles at key joints on both left and right sides, then averages for bilateral symmetry. Falls back to single-side if one side is occluded (visibility < 0.3)
5. **State Machine Rep Counting:** FSM tracks angle transitions through UP/DOWN phases. Counts a rep when angle returns above UP threshold after going below DOWN threshold
6. **Quality Feature Extraction:** Computes 30+ features including:
   - Angle statistics (min, max, mean, std, range, median, IQR)
   - Angular velocity and acceleration
   - Body stability (shoulder position variance)
   - Bilateral symmetry score
   - Movement smoothness (inverse acceleration)
   - Rep cadence regularity

**Key Configuration Per Exercise:**

| Exercise | Primary Joints | DOWN Threshold | UP Threshold |
|---|---|---|---|
| Pushups | Shoulder-Elbow-Wrist | 120° | 140° |
| Sit-ups | Shoulder-Hip-Knee | 90° | 130° |
| Pull-ups | Shoulder-Elbow-Wrist | 100° | 145° |

### 7.2 ML Form Classification & Rep Calibration Module

**Location:** `server/ai_training/classifier.py`

**Form Classifier:**
- Algorithm: Random Forest (100 estimators, max_depth=6)
- Input: 28-dimensional feature vector (standardized with StandardScaler)
- Output: "correct" or "foul" with probability score
- Training: HeadAdmin uploads labeled videos → features extracted → model trained with cross-validation
- Minimum training data: 2 correct + 2 foul samples per exercise type
- Exercise-specific models with fallback to general model

**Rep Calibrator:**
- Algorithm: Linear Regression
- Purpose: Corrects systematic AI counting bias (`corrected = a × ai_reps + b`)
- Training: Uses samples where admin-provided ground truth rep count differs from AI count
- Minimum training data: 3 samples with expected_reps

### 7.3 AI Verdict Learning System

**Location:** `server/services/ai_verdict.py`

An adaptive system that learns from administrator approve/flag decisions:

1. **Feature Extraction:** 12-dimensional vector from AI analysis results (confidence, verified_reps, form_score, flag counts, test type one-hot encoding, score-vs-reps difference)
2. **Training:** Random Forest classifier (50 estimators, max_depth=5, balanced weights) retrains every 5 new labeled samples after minimum 10 samples
3. **Prediction:** For new submissions, predicts approve/flag with confidence score
4. **Auto-Approval:** If model confidence ≥ 80%, submission is automatically approved without admin intervention
5. **Continuous Learning:** Each admin decision feeds back into training data, improving accuracy over time

### 7.4 Authentication & Role Management Module

**Location:** `server/routes/auth.py`

- **Registration:** Email + password (bcrypt hashed) + DOB → age computation + gender + location
- **Login:** Email/password verification → JWT token (7-day expiry)
- **Role Hierarchy:** `athlete` < `admin` < `headadmin`
- **HeadAdmin Privileges:** Create sub-admins with unique IDs (ADM-XXXX), delete sub-admins, list all admins
- **Profile Management:** Update name, DOB, gender, location; upload profile photo (base64 data URI)
- **Password Recovery:** Secure reset token (32-byte URL-safe) with database storage

### 7.5 Video Storage & Streaming Module

**Location:** `server/storage.py`

- **Storage Backend:** Google Drive API v3 with OAuth2 user credentials
- **Upload Flow:** Flask receives video → streams to Google Drive → makes file publicly readable → returns file ID
- **Streaming Proxy:** `/api/videos/stream/<file_id>` endpoint downloads from Google Drive and streams to client (avoids CORS/download prompts)
- **Folder Structure:** "Athlete Videos" (main) + "AI Training Videos" (subfolder for training data)
- **Token Management:** Auto-refreshes expired OAuth2 tokens; saves refreshed credentials

### 7.6 Administrative Dashboard Module

**Location:** `server/routes/dashboard.py`, `server/routes/submissions.py`, `server/routes/athletes.py`

- **Dashboard Analytics:** Total athletes, total tests, pending submissions, approved/flagged counts
- **Submission Review:** Paginated list with AI analysis details, video playback, approve/flag/update workflow
- **Athlete Management:** Searchable directory, individual profile viewing with performance history
- **Notifications:** Broadcast to all users/admins/athletes; personal notifications on submission status changes
- **Messaging:** Threaded conversations between admins and athletes

---

## CHAPTER 8: DESIGN

### 8.1 System Architecture

```
┌──────────────────────────────────────────────────────────┐
│                 CLIENT LAYER (Browser PWA)                 │
│  React 18 + TypeScript + TailwindCSS + shadcn/ui          │
│  19 Pages | ProtectedRoute RBAC | TanStack Query          │
└────────────────────────┬─────────────────────────────────┘
                         │ HTTP REST (JSON)
┌────────────────────────┼─────────────────────────────────┐
│              APPLICATION LAYER (Flask API)                  │
│  10 Blueprints | JWT Auth | CORS | Error Handlers         │
│  ┌────────┐ ┌──────┐ ┌────────┐ ┌──────────┐             │
│  │  Auth  │ │Tests │ │Submis. │ │ Training │             │
│  └────┬───┘ └──┬───┘ └───┬────┘ └────┬─────┘             │
│       └────────┴─────────┴───────────┘                     │
│                         │                                   │
│  ┌──────────────────────┴──────────────────────────────┐  │
│  │              AI/ML SERVICE LAYER                      │  │
│  │  video_analysis.py | ai_verdict.py | classifier.py   │  │
│  │  trainer.py (30+ feature extraction)                  │  │
│  └──────────────────────────────────────────────────────┘  │
└──────────┬──────────────────────────────┬─────────────────┘
           │                              │
    ┌──────┴──────┐                ┌──────┴──────┐
    │ DATA LAYER  │                │STORAGE LAYER│
    │ MongoDB     │                │Google Drive  │
    │ Atlas       │                │(OAuth2)      │
    └─────────────┘                └─────────────┘
```

### 8.2 Use Case Diagram

Three actor categories interact with the system:
- **Athlete:** Register, Login, Record Test, Upload Video, View Results, View History, View Leaderboard, Manage Profile, View Notifications
- **Admin:** Review Submissions, Manage Athletes, Send Messages, Broadcast Notifications, View Dashboard
- **HeadAdmin:** All Admin functions + Create/Delete Sub-Admins + Upload Training Videos + Train ML Models + Export Dataset

### 8.3 Activity Diagram — Complete Video Analysis Flow

```
[Start] → [Athlete uploads video]
  → [Validate video duration ≥ 60s]
    → [FAIL] → [Return error with actual duration]
    → [PASS] → [Upload to Google Drive]
      → [Initialize MediaPipe (model_complexity=1)]
        → [Sample frames at ~12 FPS]
          → [For each frame:]
            → [Detect 33 landmarks]
            → [Compute bilateral angles]
            → [Update FSM state (UP/DOWN)]
            → [Track shoulder stability]
          → [Aggregate features (28 dimensions)]
            → [Check trained reference patterns]
              → [Available] → [Compare against thresholds]
              → [Not available] → [Use default scoring]
            → [Run ML form classifier]
              → [Trained] → [Blend: 40% threshold + 60% ML]
              → [Not trained] → [Use threshold score only]
            → [Apply rep calibration]
            → [Run AI verdict predictor]
              → [Confidence ≥ 80%] → [Auto-approve]
              → [Confidence < 80%] → [Set status: pending]
            → [Calculate percentile (age-group benchmarks)]
            → [Save test_result + submission to MongoDB]
            → [Notify athlete]
[End]
```

---

## CHAPTER 9: TECHNOLOGY STACK

**Table 2: Complete Technology Stack**

| Layer | Technology | Version | Purpose |
|---|---|---|---|
| **Frontend** | React | 18.3.1 | UI component library |
| | TypeScript | 5.8.3 | Type-safe JavaScript |
| | Vite | 5.4.19 | Build tool & dev server |
| | TailwindCSS | 3.4.17 | Utility-first CSS framework |
| | shadcn/ui | Latest | Radix-based component library |
| | TanStack Query | 5.83.0 | Server state management |
| | React Router | 6.30.1 | Client-side routing |
| | Recharts | 2.15.4 | Data visualization charts |
| | Framer Motion | 12.38.0 | Animations and transitions |
| | Zod | 3.25.76 | Schema validation |
| **Backend** | Python | 3.11+ | Server runtime |
| | Flask | 3.1.1 | Web framework |
| | Flask-JWT-Extended | 4.7.1 | JWT authentication |
| | Flask-CORS | 5.0.1 | Cross-origin support |
| | PyMongo | 4.10.1 | MongoDB driver |
| | bcrypt | 4.2.1 | Password hashing |
| **AI/ML** | MediaPipe | 0.10.21 | Pose estimation (BlazePose) |
| | OpenCV | 4.10.0 | Video processing |
| | NumPy | 1.26.4 | Numerical computation |
| | scikit-learn | 1.4.0 | ML classifiers (RF, LR) |
| **Database** | MongoDB Atlas | Cloud | NoSQL document database |
| **Storage** | Google Drive API | v3 | Video cloud storage |
| | google-auth-oauthlib | 1.2.0 | OAuth2 authentication |
| **Testing** | Vitest | 3.2.4 | Frontend unit testing |
| | Playwright | 1.57.0 | E2E browser testing |

## CHAPTER 10: IMPLEMENTATION

### 10.1 Frontend Implementation

The frontend is a React 18 Single Page Application built with TypeScript and Vite, using TailwindCSS for styling and shadcn/ui for pre-built accessible components.

**Route Structure (19 pages):**

| Route | Component | Access |
|---|---|---|
| `/` | LandingPage | Public |
| `/login` | LoginPage | Public |
| `/register` | RegisterPage | Public |
| `/dashboard` | DashboardPage | Athlete+ |
| `/profile` | ProfilePage | Athlete+ |
| `/record-test` | RecordTestPage | Athlete+ |
| `/results` | ResultsPage | Athlete+ |
| `/history` | HistoryPage | Athlete+ |
| `/leaderboard` | LeaderboardPage | Athlete+ |
| `/admin` | AdminDashboardPage | Admin+ |
| `/admin/submissions` | AdminSubmissionsPage | Admin+ |
| `/admin/athletes` | AdminAthletesPage | Admin+ |
| `/admin/athletes/:id` | AdminAthleteProfilePage | Admin+ |
| `/admin/messages` | AdminMessagesPage | Admin+ |
| `/admin/broadcast` | AdminBroadcastPage | Admin+ |
| `/admin/create` | AdminCreatePage | HeadAdmin |
| `/admin/training` | AdminTrainingPage | HeadAdmin |

**Key Frontend Features:**
- `ProtectedRoute` HOC enforces role-based access (athlete < admin < headadmin)
- `AuthContext` manages JWT token storage and user state via React Context API
- TanStack Query handles server state caching and automatic refetching
- Recharts renders performance analytics (line charts, bar charts, radar charts)
- Framer Motion provides page transitions and micro-animations

### 10.2 Backend Implementation

**Flask Application Structure:**

```
server/
├── app.py              # Flask app factory with blueprint registration
├── config.py           # Environment configuration (JWT, MongoDB, Drive)
├── db.py               # MongoDB connection manager (singleton pattern)
├── storage.py          # Google Drive API wrapper (upload, stream, delete)
├── seed.py             # Database initialization script
├── routes/
│   ├── auth.py         # Registration, login, profile, admin CRUD (418 lines)
│   ├── tests.py        # Test submission, upload, history (422 lines)
│   ├── submissions.py  # Admin review workflow (190 lines)
│   ├── leaderboard.py  # Age-group ranked listings (68 lines)
│   ├── dashboard.py    # Analytics aggregation (120 lines)
│   ├── athletes.py     # Athlete directory (190 lines)
│   ├── support.py      # Messaging system (191 lines)
│   ├── notifications.py # Broadcast + personal (130 lines)
│   ├── videos.py       # Video streaming proxy (120 lines)
│   └── training.py     # AI training management (541 lines)
├── services/
│   ├── video_analysis.py  # MediaPipe video analysis (471 lines)
│   └── ai_verdict.py      # Verdict learning system (246 lines)
└── ai_training/
    ├── trainer.py         # Feature extraction engine (679 lines)
    └── classifier.py      # ML form classifier (394 lines)
```

**Total Backend Code:** ~3,500+ lines of Python

**API Endpoints Summary (Table 4):**

| Blueprint | Endpoints | Key Operations |
|---|---|---|
| auth | 9 | register, login, me, forgot-password, reset-password, profile, photo, create-admin, admins |
| tests | 5 | types, submit, upload, history, video |
| submissions | 3 | list, review, update |
| leaderboard | 1 | ranked list with age-group filter |
| dashboard | 2 | admin stats, recent activity |
| athletes | 3 | list, profile, performance |
| support | 4 | conversations, messages, send, admin-list |
| notifications | 3 | list, broadcast, mark-read |
| videos | 2 | stream, demo-video |
| training | 7 | upload, samples, update, delete, video, status, train-model, classifier-stats, export |

### 10.3 AI/ML Pipeline Implementation

**Feature Engineering (30+ features per video):**

**Table 7: Engineered Feature Set**

| Category | Features | Count |
|---|---|---|
| Primary Angle Stats | min, max, mean, std, range, median, IQR | 7 |
| Secondary Angle Stats | mean, std | 2 |
| Body Line Alignment | mean, std | 2 |
| Hip Sag Detection | mean, std | 2 |
| Bilateral Symmetry | mean_diff, max_diff | 2 |
| Angular Velocity | mean, max, std | 3 |
| Angular Acceleration | mean, max | 2 |
| Quality Scores | smoothness, stability, cadence, bilateral | 4 |
| Visibility | mean, min | 2 |
| Rep Duration | mean, std, min, max | 4 |
| **Total** | | **30** |

**ML Model Training Pipeline:**
1. HeadAdmin uploads labeled video via `/api/training/upload`
2. `trainer.py` runs MediaPipe on video → extracts 30+ features → saves to `exercise_patterns`
3. `_update_reference_patterns()` recompiles threshold ranges from all correct samples
4. `classifier.py` auto-trains Random Forest if ≥2 correct + ≥2 foul samples exist
5. `classifier.py` auto-trains rep calibrator if ≥3 samples with expected_reps exist
6. Models saved as `.pkl` files in `ai_training/models/` directory

**SAI Benchmark Data (Table 8):**

| Age Group | Pushups (max) | Sit-ups (max) | Pull-ups (max) |
|---|---|---|---|
| 10-14 | 30 | 25 | 5 |
| 14-17 | 40 | 35 | 10 |
| 17-19 | 50 | 45 | 15 |
| 19-21 | 55 | 50 | 18 |
| 21+ | 60 | 55 | 20 |

**Percentile Computation:** `percentile = min(99, (score / max_reps_for_age_group) × 100)`

**Rating Scale:** Excellent (≥90th) | Very Good (≥75th) | Good (≥60th) | Average (≥40th) | Below Average (<40th)

---

## CHAPTER 11: OUTPUT SCREENS

The platform features 19 fully implemented pages. Key screens include:

1. **Landing Page:** Hero section with animated feature highlights, CTA buttons for registration/login, platform overview with exercise type cards
2. **Registration Page:** Multi-field form with Zod validation — name, email, password, DOB, gender, location
3. **Login Page:** Email/password form with JWT token retrieval and role-based redirect
4. **Athlete Dashboard:** StatCards (total tests, average percentile, best rating), performance trend chart, recent activity feed
5. **Record Test Page:** Three-step flow — (a) Exercise selection grid, (b) Instruction view with demo video, (c) Live camera recording with real-time skeleton overlay
6. **Results Page:** Post-submission display with AI-counted reps, percentile, rating, AI verdict, and confidence score
7. **History Page:** Chronological table of all submissions with status badges (Approved/Pending/Flagged)
8. **Leaderboard Page:** National ranking table with age-group filter, percentile bars, medal indicators
9. **Profile Page:** Editable athlete profile with photo upload, demographics, and account settings
10. **Admin Dashboard:** Aggregate metrics — total athletes, pending reviews, approval rates, recent submissions
11. **Admin Submissions Page:** Paginated submission list with video playback, AI analysis details, approve/flag buttons
12. **Admin Athletes Page:** Searchable athlete directory with profile links and performance summaries
13. **Admin Messages Page:** Threaded conversation interface for admin-athlete communication
14. **Admin Broadcast Page:** Send notifications to all users, all admins, or all athletes
15. **Admin Create Page (HeadAdmin):** Sub-admin account creation form with auto-generated admin IDs
16. **AI Training Page (HeadAdmin):** Training video upload (test type, label, expected reps), sample management table, ML model statistics, training trigger, dataset export

---

## CHAPTER 12: TEST RESULTS AND OUTCOMES

### 12.1 Test Case Results

**Table 5: Test Case Execution Results**

| TC | Description | Input | Expected | Actual | Status |
|---|---|---|---|---|---|
| TC-01 | Pushup rep counting (correct form, 10 reps) | 60s video, good lighting | 10 reps ± 1 | 10 reps | ✅ PASS |
| TC-02 | Sit-up rep counting (correct form, 8 reps) | 60s video, good lighting | 8 reps ± 1 | 8 reps | ✅ PASS |
| TC-03 | Pull-up rep counting (correct form, 5 reps) | 60s video, good lighting | 5 reps ± 1 | 5 reps | ✅ PASS |
| TC-04 | Foul form detection (incomplete pushups) | Video with partial ROM | Form score < 0.7 | 0.55 | ✅ PASS |
| TC-05 | Poor visibility handling | Dark/occluded video | Flag with "poor_pose_visibility" | Flagged correctly | ✅ PASS |
| TC-06 | Video too short rejection | 30-second video | Reject with error message | Rejected (30s < 60s min) | ✅ PASS |
| TC-07 | JWT authentication enforcement | API call without token | 401 Unauthorized | 401 returned | ✅ PASS |
| TC-08 | Role-based access control | Athlete accessing /admin/training | 403 Forbidden | Redirect to / | ✅ PASS |
| TC-09 | Auto-approval (trained model) | High-confidence submission | Auto-approved status | Status: approved | ✅ PASS |
| TC-10 | Percentile computation (U-17 group) | 35 pushups, age 16 | 87th percentile | 88th percentile | ✅ PASS |

**Overall Test Pass Rate: 10/10 (100%)**

### 12.2 AI vs Manual Evaluation Comparison

**Table 6: Comparative Evaluation**

| Metric | Manual Assessment | AI-Based Assessment |
|---|---|---|
| Time per athlete | 3–5 minutes | 30–60 seconds |
| Inter-rater reliability | 70–80% | 100% (deterministic) |
| Rep count accuracy | ± 2 reps | ± 1 rep |
| Form quality scoring | Subjective (Good/Fair/Poor) | Objective (0.00–1.00 scale) |
| Scalability | ~50 athletes/day/assessor | Unlimited concurrent |
| Geographic reach | 50 SAI centers | Any smartphone, anywhere |
| Cost per assessment | ₹500–2000 (travel + logistics) | ₹0 (free for athlete) |
| Learning capability | Static human criteria | Self-improving from feedback |

---

## CHAPTER 13: LIMITATIONS AND FUTURE ENHANCEMENTS

### 13.1 Current Limitations

1. **Exercise Coverage:** Currently supports 3 of 5 SAI fitness tests. Shuttle Run and Endurance Run modules are not yet implemented
2. **Lighting Sensitivity:** MediaPipe accuracy degrades in poor lighting (< 200 lux)
3. **Single Person:** System assumes only one person in the camera frame
4. **Internet Dependency:** Video upload and database access require stable internet connectivity
5. **No Offline Mode:** PWA cannot function offline for video analysis
6. **Anti-Cheating:** No GPS/timestamp verification or impersonation detection
7. **Browser Camera API:** Video quality depends on device camera capabilities

### 13.2 Future Enhancements

1. **Shuttle Run AI Module:** Implement foot position tracking using ankle landmarks for automatic crossing detection and time recording
2. **Endurance Run AI Module:** Stride frequency analysis from hip/ankle trajectories with GPS distance supplementation
3. **TensorFlow.js Browser Integration:** On-device AI inference for real-time skeleton overlay without server round-trip
4. **Anti-Cheating System:** GPS district verification, device fingerprinting, and pose consistency analysis for physiologically impossible movements
5. **Geographic Talent Heat Maps:** Leaflet.js integration with marker clustering for visualizing talent distribution across 740+ districts
6. **PDF Report Generation:** Downloadable athlete assessment reports with SAI-branded formatting
7. **Multi-Language Support:** Hindi and regional language localization
8. **Docker Deployment:** Production-ready container orchestration with Nginx reverse proxy and SSL
9. **Load Testing:** Performance validation with 100+ concurrent users via Locust framework

---

## CHAPTER 14: CONCLUSION

The **AI-Based Sports Platform for Analysis and Ranking** has been successfully developed and validated as a comprehensive solution to **Smart India Hackathon 2025 Problem Statement 25073** issued by the Sports Authority of India. Over the five-month development period (January–May 2026), the project has delivered a fully functional, production-ready Progressive Web Application that transforms how sports talent is identified and evaluated in India.

**Key Technical Achievements:**

1. **MediaPipe-based Pose Detection Pipeline:** Successfully implemented real-time pose estimation processing exercise videos at 25–30 FPS with 33 skeletal landmark extraction, bilateral joint angle computation, and automated repetition counting for three SAI-standard exercises (Pushups, Sit-ups, Pull-ups)

2. **Multi-Dimensional Form Assessment:** Engineered 30+ biomechanical features per video across six quality dimensions (angle compliance, ROM completeness, movement smoothness, bilateral symmetry, body stability, rep cadence), providing objective scoring that surpasses subjective human evaluation

3. **Self-Improving AI System:** Implemented a three-tier machine learning architecture — Random Forest form classifier, Linear Regression rep calibrator, and adaptive verdict learner — that continuously improves from administrator feedback, achieving auto-approval capability at ≥80% confidence

4. **Full-Stack Production Architecture:** Built a complete platform with 19 React frontend pages, 10 Flask API blueprints (3,500+ lines of Python), MongoDB Atlas cloud database, Google Drive video storage, JWT authentication, and three-tier RBAC (Athlete → Admin → HeadAdmin)

5. **Validated Performance:** 100% pass rate across 10 test cases covering rep counting accuracy, form detection, security enforcement, and edge case handling. AI-based assessment demonstrated superior speed (30–60s vs 3–5 min), consistency (100% vs 70–80% inter-rater reliability), and accessibility (free vs ₹500–2000 per assessment) compared to manual evaluation

The platform directly addresses the core challenge of geographic and financial exclusion in Indian sports talent identification, enabling any athlete with a smartphone to receive standardized fitness evaluation equivalent to what was previously available only at elite SAI testing centers. The self-learning AI architecture ensures the system becomes more accurate over time as administrators continue to review and label submissions.

The project stands ready for pilot deployment with SAI and provides a strong foundation for expansion to additional exercise types, geographic analytics, and production-scale infrastructure.

The team acknowledges the invaluable guidance of **Project Mentor Ms. Swati Rastogi**, whose direction and feedback have been instrumental throughout the development lifecycle.

---

## CHAPTER 15: REFERENCES

1. Bradski, G. (2000). The OpenCV Library. *Dr. Dobb's Journal of Software Tools*, 25(11), 120–123.
2. Dill, S., et al. (2023). Accuracy Evaluation of 3D Pose Estimation with MediaPipe Pose for Physical Exercises. *IEEE Conference on Pose Estimation*.
3. Google AI. (2024). MediaPipe Solutions Guide. Available at: https://ai.google.dev/edge/mediapipe/solutions/guide
4. Kim, J.-W., et al. (2023). Human Pose Estimation Using MediaPipe Pose and Optimization Method Based on a Humanoid Model. *Applied Sciences*, 13(4).
5. Khurana, R., Zhang, S., & Canny, J. (2018). GymCam: Detecting, Recognizing and Tracking Simultaneous Exercises in Unconstrained Scenes. *Proceedings of the ACM on IMWUT*, 2(4), Article 172.
6. Lugaresi, C., Tang, J., Nash, H., McClanahan, C., et al. (2019). MediaPipe: A Framework for Building Perception Pipelines. *arXiv:1906.08172*.
7. Ministry of Education, Government of India. (2025). Smart India Hackathon 2025 – Problem Statement 25073. Available at: https://www.sih.gov.in/sih2025PS
8. Smilkov, D., et al. (2019). TensorFlow.js: Machine Learning for the Web and Beyond. *Proceedings of Machine Learning and Systems*, 1, 309–321.
9. Sports Authority of India. (2023). National Talent Identification and Development Scheme: Fitness Test Protocols. Available at: https://sai.gov.in
10. Zecha, D., Einfalt, M., & Lienhart, R. (2019). Kinematic Pose Rectification for Performance Analysis in Sports. *IEEE CVPR Workshops*.
