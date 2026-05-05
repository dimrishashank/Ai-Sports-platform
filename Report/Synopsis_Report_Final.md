# PROJECT SYNOPSIS

## For

## AI-Based Sports Platform for Analysis and Ranking

**Date:** May 2026

---

### Prepared by

| Specialization | SAP ID | Name |
|---|---|---|
| B.Tech CSE (AI & ML) | 500124397 | Shashank Dimri |

**AI Cluster**
**School of Computer Science**
**UNIVERSITY OF PETROLEUM & ENERGY STUDIES,**
**DEHRADUN — 248007. Uttarakhand**

---

## Revision History

| Date | Change | Reason for Changes | Mentor Signature |
|---|---|---|---|
| Jan 2026 | Initial Synopsis submitted | Project initiation | |
| Mar 2026 | Progress Report submitted | Mid-term review | |
| May 2026 | Final Synopsis + End-Term Report | Project completion | |

---

## TABLE OF CONTENTS

| Topic | Sub-Topic | Page No |
|---|---|---|
| 1 | Introduction | |
| | 1.1 Purpose of the Project | |
| | 1.2 Target Beneficiary | |
| | 1.3 Project Scope | |
| | 1.4 References | |
| 2 | Project Description | |
| | 2.1 Reference Algorithm | |
| | 2.2 Characteristic of Data | |
| | 2.3 SWOT Analysis | |
| | 2.4 Project Features | |
| | 2.5 User Classes and Characteristics | |
| | 2.6 Design and Implementation Constraints | |
| | 2.7 Design Diagrams | |
| | 2.8 Assumptions and Dependencies | |
| 3 | System Requirements | |
| | 3.1 User Interface | |
| | 3.2 Software Interface | |
| | 3.3 Database Interface | |
| | 3.4 Protocols | |
| 4 | Non-functional Requirements | |
| | 4.1 Performance Requirements | |
| | 4.2 Security Requirements | |
| | 4.3 Software Quality Attributes | |
| 5 | Other Requirements | |
| | Appendix A: Glossary | |
| | Appendix B: Analysis Model | |
| | Appendix C: Issues List | |

---

## 1. INTRODUCTION

### 1.1 Purpose of the Project

India, home to over 400 million youth, faces a critical bottleneck in sports talent identification. The Sports Authority of India (SAI) operates approximately 50 testing centers concentrated in major cities, leaving athletes across 740+ districts — particularly in rural and semi-urban regions — without access to standardized fitness evaluation. Traditional assessment requires athletes to physically travel to SAI centers, incurring significant financial and logistical barriers that disproportionately exclude underprivileged talent.

This project directly responds to **Smart India Hackathon 2025 Problem Statement 25073**, issued by the Sports Authority of India under the Ministry of Education, Government of India. The problem statement calls for an **AI-based solution to enable remote sports talent assessment and ranking**, eliminating the need for athletes to travel to centralized testing facilities.

The **AI-Based Sports Platform for Analysis and Ranking** is a full-stack Progressive Web Application (PWA) that leverages **MediaPipe BlazePose** for real-time human pose estimation, **OpenCV** for video processing, and **scikit-learn Random Forest classifiers** for machine learning-based form assessment. Athletes record SAI-standard fitness test videos using only a smartphone camera; the AI pipeline automatically:

1. **Detects body pose** using 33 skeletal landmarks at 25–30 FPS
2. **Counts exercise repetitions** via finite state machine logic on joint angle trajectories
3. **Scores movement quality** across six dimensions: angle range compliance, range-of-motion completeness, movement smoothness, bilateral symmetry, body stability, and rep cadence consistency
4. **Generates percentile rankings** against official SAI NTIDS benchmark data, stratified by age group and gender
5. **Provides AI-driven pass/flag verdicts** that learn and improve from administrator feedback

The platform democratizes access to standardized sports evaluation, enabling any athlete with a smartphone to receive the same quality of assessment previously available only at elite training centers.

### 1.2 Target Beneficiary

The primary beneficiaries of this project are:

1. **Rural and Semi-Urban Athletes (Ages 10–21):** Youth in India's 740+ districts who lack proximity to SAI testing centers. The platform enables them to undergo standardized fitness evaluation from home using only a smartphone camera, eliminating travel costs and geographic barriers.

2. **Sports Authority of India (SAI) Officials:** Administrators gain a centralized digital dashboard to review AI-analyzed submissions at scale, discover talent across geographic regions, and make data-driven selection decisions without requiring physical presence at testing sites.

3. **Sports Coaches and Training Academies:** Coaches receive objective, AI-generated performance metrics and form analysis that supplement their training programs. The percentile ranking system allows benchmarking athletes against national standards.

4. **State Sports Departments and District Sports Officers:** Regional administrators can identify local talent pools through the leaderboard and analytics features, enabling targeted investment in promising athletes.

5. **Parents and Guardians of Young Athletes:** Families gain transparent, unbiased assessment reports that validate their children's athletic potential without the financial burden of traveling to distant testing centers.

### 1.3 Project Scope

The project delivers a complete, production-ready platform comprising:

**Frontend (React.js + TypeScript + Vite):**
- Responsive PWA with 19 route-based pages covering athlete and admin workflows
- Real-time video recording with live pose skeleton overlay
- Performance dashboards with Recharts-based visualization
- Role-based navigation (Athlete → Admin → HeadAdmin hierarchy)

**Backend (Python Flask + MongoDB Atlas):**
- RESTful API with 10 route blueprints (auth, tests, submissions, leaderboard, dashboard, athletes, support, notifications, videos, training)
- JWT-based authentication with bcrypt password hashing
- Google Drive API integration for video storage with OAuth2 credentials

**AI/ML Pipeline:**
- MediaPipe BlazePose pose estimation (33 landmarks, model_complexity=1)
- Bilateral joint angle computation with NumPy arccos formula
- Finite state machine rep counter for Pushups, Sit-ups, and Pull-ups
- 30+ engineered features per video (angle statistics, angular velocity/acceleration, bilateral symmetry, body stability, cadence regularity)
- Random Forest form classifier (correct vs. foul) with StandardScaler preprocessing
- Linear Regression rep calibrator for AI counting bias correction
- AI Verdict Learner that improves from administrator approve/flag decisions

**Deliverables:**
1. Fully functional PWA accessible on mobile and desktop browsers
2. AI analysis pipeline for three SAI fitness tests (Pushups, Sit-ups, Pull-ups)
3. Administrative dashboard with submission review, athlete management, and broadcast notifications
4. HeadAdmin AI training interface for uploading labeled reference videos
5. Comprehensive documentation (Synopsis, SRS, Progress Report, End-Term Report)

### 1.4 References

1. Bradski, G. (2000). The OpenCV Library. *Dr. Dobb's Journal of Software Tools*, 25(11), 120–123.
2. Dill, S., et al. (2023). Accuracy Evaluation of 3D Pose Estimation with MediaPipe Pose for Physical Exercises. *IEEE Conference on Pose Estimation*.
3. Google AI. (2024). MediaPipe Solutions Guide. https://ai.google.dev/edge/mediapipe/solutions/guide
4. Kim, J.-W., et al. (2023). Human Pose Estimation Using MediaPipe Pose and Optimization Method Based on a Humanoid Model. *Applied Sciences*, 13(4).
5. Khurana, R., Zhang, S., & Canny, J. (2018). GymCam: Detecting, Recognizing and Tracking Simultaneous Exercises. *Proceedings of ACM IMWUT*, 2(4), Article 172.
6. Lugaresi, C., et al. (2019). MediaPipe: A Framework for Building Perception Pipelines. *arXiv:1906.08172*.
7. Ministry of Education, Government of India. (2025). Smart India Hackathon 2025 – Problem Statement 25073. https://www.sih.gov.in/sih2025PS
8. Smilkov, D., et al. (2019). TensorFlow.js: Machine Learning for the Web and Beyond. *Proceedings of MLSys*, 1, 309–321.
9. Sports Authority of India. (2023). National Talent Identification and Development Scheme: Fitness Test Protocols. https://sai.gov.in
10. Zecha, D., Einfalt, M., & Lienhart, R. (2019). Kinematic Pose Rectification for Performance Analysis in Sports. *IEEE CVPR Workshops*.

---

## 2. PROJECT DESCRIPTION

### 2.1 Reference Algorithm

The project employs a multi-stage AI pipeline:

**Stage 1: Pose Estimation — MediaPipe BlazePose**
MediaPipe BlazePose detects 33 skeletal landmarks from monocular video input using a two-step detector-tracker architecture. Configuration: `model_complexity=1`, `min_detection_confidence=0.5`, `min_tracking_confidence=0.5`. Frames sampled at ~12–15 FPS.

**Stage 2: Joint Angle Computation — Inverse Cosine (arccos)**
Joint angles computed using the vector dot product formula: `angle(a, b, c) = arccos((ba · bc) / (|ba| × |bc|))`. Bilateral averaging combines left and right side measurements. Key joints:
- Pushups: Shoulder → Elbow → Wrist
- Sit-ups: Shoulder → Hip → Knee
- Pull-ups: Shoulder → Elbow → Wrist

**Stage 3: Repetition Counting — Finite State Machine (FSM)**
Three-state FSM (INIT → UP → DOWN → UP) counts reps using exercise-specific angle thresholds. Smoothed with 5-point moving average kernel.

**Stage 4: Form Classification — Random Forest Classifier**
scikit-learn Random Forest (100 estimators, max_depth=6, balanced class weights) classifies form as "correct" or "foul" using 28 engineered features with StandardScaler normalization.

**Stage 5: Rep Calibration — Linear Regression**
Corrects AI counting bias: `corrected_reps = a × ai_reps + b`, trained on HeadAdmin ground truth data.

**Stage 6: AI Verdict Learning — Adaptive Random Forest**
Online learning from administrator approve/flag decisions. Auto-approves when confidence ≥ 80%.

### 2.2 Characteristic of Data

**Primary Data Sources:**
1. **Athlete Video Submissions:** WebM/MP4 videos, minimum 60 seconds, 720p–1080p resolution
2. **HeadAdmin Training Videos:** Labeled "correct" or "foul", processed into 30+ statistical features
3. **SAI NTIDS Benchmark Data:** Age-group stratified maximum rep counts for percentile computation

**Data Processing:** MediaPipe → Joint angles → Statistical aggregation → 28-dimensional feature vectors → MongoDB storage

### 2.3 SWOT Analysis

| | Helpful | Harmful |
|---|---|---|
| **Internal** | **Strengths:** Production-grade MediaPipe; Self-improving AI; Full-stack RBAC; Cloud-accessible PWA | **Weaknesses:** Requires internet; Pose accuracy in poor lighting; 3 of 5 exercises implemented |
| **External** | **Opportunities:** SIH 2025 PS-25073; 400M+ Indian youth; Scalable to more sports | **Threats:** Competition from sports tech; Privacy concerns; Google API dependence |

### 2.4 Project Features

**Athlete:** Registration/Auth, Video Recording with skeleton overlay, Video Upload with AI analysis, Dashboard analytics, Test History, Leaderboard, Profile Management, Notifications

**Admin:** Dashboard statistics, Submission review (approve/flag), Athlete management, Messaging, Broadcast notifications

**HeadAdmin:** Sub-admin CRUD, AI training video upload, ML model training/export, Training sample management

### 2.5 User Classes and Characteristics

| User Class | Role | Access Level |
|---|---|---|
| Athlete | `athlete` | Standard — record/upload tests, view results |
| Sub-Admin | `admin` | Elevated — review submissions, manage athletes |
| Head Administrator | `headadmin` | Full — admin CRUD, AI training, model management |

### 2.6 Design and Implementation Constraints

- **Frontend:** Node.js 18+, Vite 5.x, TypeScript 5.x, React 18, TailwindCSS
- **Backend:** Python 3.11+, Flask 3.1.1, MongoDB Atlas
- **AI:** MediaPipe 0.10.21, OpenCV 4.10.0, scikit-learn 1.4.0
- **Security:** JWT (7-day expiry), bcrypt hashing, OAuth2 for Google Drive, RBAC on all endpoints
- **Network:** Stable internet required, <2s API response target

### 2.7 Design Diagrams

*(Use Case, System Architecture, Activity Diagrams included in full report — see SRS document)*

### 2.8 Assumptions and Dependencies

**Assumptions:** Smartphone with camera + internet; well-lit environment; single person in frame; SAI protocol exercises; sufficient training data from HeadAdmin

**Dependencies:** MongoDB Atlas, Google Drive API, MediaPipe, scikit-learn, stable network

---

## 3. SYSTEM REQUIREMENTS

### 3.1 User Interface

The frontend is built with React 18 + TypeScript + TailwindCSS + shadcn/ui component library, deployed as a PWA via Vite. Key UI components:

- **LandingPage:** Hero section with platform overview, feature highlights, CTA buttons
- **LoginPage / RegisterPage:** Form-based authentication with validation (Zod + react-hook-form)
- **DashboardPage:** StatCards showing test count, average percentile, best rating; Recharts performance graphs
- **RecordTestPage:** Exercise selector → instruction view with demo video → live camera recording with MediaPipe skeleton overlay → results display
- **AdminDashboardPage:** Aggregate metrics, recent submissions, athlete counts
- **AdminTrainingPage:** Video upload form (test type, label, expected reps), training sample table with playback, ML model stats

All pages are responsive (mobile-first) with role-based navigation via the Navbar component.

### 3.2 Software Interface

**Module Connections:**

| Module | Connects To | Protocol |
|---|---|---|
| React Frontend | Flask Backend | HTTP REST (JSON) |
| Flask Backend | MongoDB Atlas | pymongo (TLS) |
| Flask Backend | Google Drive | googleapis (OAuth2) |
| Flask Backend | MediaPipe | Python library call |
| Flask Backend | scikit-learn | Python library call |
| Video Analysis | AI Trainer | Internal Python import |
| AI Verdict | Training Data | MongoDB read/write |

**API Blueprint Structure:**
- `/api/auth/*` — Authentication (register, login, profile, admin CRUD)
- `/api/tests/*` — Test submission, upload, history
- `/api/submissions/*` — Admin review workflow
- `/api/leaderboard` — Ranked athlete listings
- `/api/dashboard/*` — Analytics aggregation
- `/api/athletes/*` — Athlete directory
- `/api/support/*` — Messaging system
- `/api/notifications/*` — Broadcast and personal notifications
- `/api/videos/*` — Video streaming proxy
- `/api/training/*` — AI training management (HeadAdmin)

### 3.3 Database Interface

**MongoDB Atlas** (cloud-hosted NoSQL document database)

**Collections:**
| Collection | Purpose | Key Fields |
|---|---|---|
| `users` | User accounts | email, password_hash, role, dob, age, gender, location |
| `test_results` | Test performance records | user_id, test_type, score, percentile, rating, video_key |
| `submissions` | Admin review queue | user_id, test_result_id, status, ai_verification, ai_verdict |
| `test_types` | Exercise configuration | name, description, duration, unit, status, pose_config |
| `benchmarks` | SAI benchmark data | label, pushups, situps, pull_ups |
| `exercise_patterns` | AI training data | test_type, label, pattern, ai_rep_count, expected_reps |
| `reference_patterns` | Compiled thresholds | test_type, thresholds, quality_benchmarks |
| `ai_training_data` | Verdict learning data | submission_id, features, label |
| `notifications` | User notifications | type, user_id, title, message, read |
| `messages` | Chat messages | sender_id, receiver_id, content, timestamp |

**Indexes:** Unique on `users.email`; compound on `test_results(test_type, percentile)`; sorted on `test_results.date` and `submissions.date`

### 3.4 Protocols

- **HTTP/HTTPS:** RESTful API communication between frontend and backend
- **JWT (JSON Web Token):** Stateless authentication with 7-day expiry tokens
- **OAuth 2.0:** Google Drive API authorization for video storage
- **TLS 1.2+:** Encrypted MongoDB Atlas connections via `certifi`
- **CORS:** Cross-Origin Resource Sharing configured for development origins (localhost:5173, 8080, 3000)

---

## 4. NON-FUNCTIONAL REQUIREMENTS

### 4.1 Performance Requirements

- MediaPipe processes video at 25–30 FPS on standard hardware
- API response time target: <2 seconds under normal load
- Video analysis: ~30–60 seconds for a 60-second video
- MongoDB Atlas automatic scaling for concurrent users
- Frontend builds optimized via Vite tree-shaking and code splitting

### 4.2 Security Requirements

- **Authentication:** JWT tokens with configurable expiry; bcrypt password hashing with random salt
- **Authorization:** Role-based access control (athlete < admin < headadmin) enforced on every API endpoint
- **Data Protection:** Google Drive OAuth2 with automatic token refresh; TLS for all database connections
- **Input Validation:** Server-side validation on all API inputs; file type and size restrictions (videos, photos)
- **Password Recovery:** Secure random token generation via `secrets.token_urlsafe(32)`

### 4.3 Software Quality Attributes

- **Usability:** Clean, minimalist UI with TailwindCSS; mobile-responsive design; intuitive navigation
- **Reliability:** Graceful fallbacks — MediaPipe unavailable → basic analysis; ML model unavailable → threshold-based scoring
- **Maintainability:** Modular architecture — 10 route blueprints, separated services, typed React components
- **Scalability:** Stateless API design; MongoDB Atlas auto-scaling; Google Drive cloud storage
- **Testability:** Vitest for frontend unit tests; Playwright for E2E browser tests
- **Portability:** PWA accessible on any modern browser (Chrome, Safari, Firefox); Docker-ready backend

---

## 5. OTHER REQUIREMENTS

- Platform must comply with Indian IT Act, 2000 regarding data protection
- Video data retention should follow SAI guidelines
- Platform should be accessible in English (primary) with scope for Hindi localization
- Future expansion to include Shuttle Run and Endurance Run AI modules

---

## APPENDIX A: GLOSSARY

| Term | Definition |
|---|---|
| PWA | Progressive Web Application — web app with native-like capabilities |
| MediaPipe | Google's open-source framework for building perception pipelines |
| BlazePose | MediaPipe's real-time pose estimation model detecting 33 body landmarks |
| FSM | Finite State Machine — computational model for rep counting logic |
| JWT | JSON Web Token — compact, URL-safe token for authentication |
| RBAC | Role-Based Access Control — access management based on user roles |
| SAI | Sports Authority of India |
| NTIDS | National Talent Identification and Development Scheme |
| SIH | Smart India Hackathon |
| OAuth2 | Open Authorization 2.0 — industry-standard protocol for authorization |
| Random Forest | Ensemble machine learning algorithm using multiple decision trees |
| arccos | Inverse cosine function — used for joint angle calculation |

## APPENDIX B: ANALYSIS MODEL

The AI analysis pipeline follows a sequential processing model:
1. Video Input → Frame Sampling (12–15 FPS)
2. Frame Processing → MediaPipe Pose Detection (33 landmarks)
3. Landmark Processing → Bilateral Joint Angle Computation
4. Angle Timeseries → FSM Rep Counting + Feature Extraction
5. Features → ML Classification (Random Forest) + Threshold Comparison
6. Results → Verdict Prediction + Percentile Ranking
7. Output → MongoDB Storage + Notification

## APPENDIX C: ISSUES LIST

| Issue | Status | Resolution |
|---|---|---|
| Pose detection in poor lighting | Mitigated | Added minimum visibility threshold (0.3) |
| Rep counting false positives | Resolved | 5-point moving average smoothing + bilateral averaging |
| Google Drive upload quota | Mitigated | OAuth2 user credentials (personal quota) |
| Video too short for analysis | Resolved | 60-second minimum duration validation |
| ML model cold start | Mitigated | Threshold-based fallback when no trained model exists |
