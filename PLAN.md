# prep - Implementation Plan

## Overview
Transform `company_wise_leetcode` into "prep" - a Firebase-backed PWA for tracking coding interview prep across GitHub, LeetCode, CodeChef, and HackerRank with social features, daily goals, and notifications.

## Branding
- **Name**: prep
- **Logo**: Lettermark "P" monogram
- **Colors**: Blue/teal primary (#0ea5e9), dark background
- **Domain**: prep.app or vijayaapardhu.dev/prep

## Phase 1: Firebase Foundation
1. Install Firebase SDK (Auth, Firestore, Functions, Messaging, Storage)
2. Create Firebase config and provider
3. Implement auth (email/password + Google)
4. Migrate localStorage data to Firestore on first login
5. Create user profile document

## Phase 2: PWA Infrastructure
1. Add manifest.json with app metadata
2. Add service worker for offline support
3. Add icons (192x192, 512x512, apple-touch-icon)
4. Add web push notification setup
5. Implement bottom tab navigation for mobile
6. Add full-screen mode detection for installed PWA

## Phase 3: Core Features
1. Platform connection UI (already partially done)
2. Daily goals system (auto + manual)
3. Streak tracking across platforms
4. Progress dashboard
5. Mini projects tracking

## Phase 4: Social Features
1. Study rooms (create/join, real-time chat, shared progress)
2. College cohorts (join by college, leaderboards)
3. Friend system

## Phase 5: Notifications
1. Daily goal reminders
2. Streak warnings
3. Room activity notifications
4. Weekly progress reports

## Phase 6: Polish
1. Mobile app feel (bottom tabs, gestures)
2. Settings page
3. Profile page
4. Onboarding flow
5. Error boundaries

## Files to Create/Modify
- package.json (add Firebase deps)
- app/layout.tsx (add Firebase providers, PWA meta)
- public/manifest.json
- public/sw.js
- public/icons/*
- lib/firebase/* (config, auth, firestore, messaging)
- components/auth/* (login, signup, protected routes)
- components/mobile/* (bottom tabs, mobile layout)
- app/api/* (Firebase Cloud Functions for push notifications)
- lib/store/* (update Zustand to use Firestore)
- components/social/* (rooms, cohorts, friends)
- components/goals/* (daily goals)
- components/notifications/* (notification settings)