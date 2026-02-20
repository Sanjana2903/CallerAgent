# Product Requirement Document (PRD): Ringia 🤖📞

## 1. Project Overview
Ringia is an AI-powered personal call assistant that acts as a proactive gatekeeper for your phone. It intelligently intercepts calls, engages in natural conversation to identify intent, and provides real-time control to the user.

## 2. Advanced Feature Specifications

### 2.1 Unknown Number Guard (Smart Screening)
- **Requirement**: Automatically intercept any incoming call not found in the user's contacts.
- **AI Behavior**:
    1. Answer with a professional greeting: "Hello, you've reached Sanjana's AI assistant. Who is calling and what is the purpose of your call?"
    2. Collect name and intent.
    3. Analyze intent in real-time.
    4. If it's a valid inquiry, push a priority "Screening Alert" to the user's phone.
- **User Journey**: User receives a notification -> Tap to open -> Sees live transcript of the unknown caller -> Can either watch the AI finish or hit "Take Over".

### 2.2 Productive Time (DND Mode)
- **Requirement**: A toggleable or scheduled mode where *every* incoming call is answered by the AI, regardless of contact status (except VIPs).
- **Functionality**:
    - **Manual Toggle**: "Focus Mode" button on the home screen.
    - **Schedules**: User can set "9 AM - 5 PM" as AI-only time.
- **AI Behavior**: AI explains the user is currently busy and asks to take a detailed message or offers to schedule a call back.

### 2.3 Delivery App & Logistics Integration
- **Requirement**: Specialized AI personalities for delivery drivers (Zomato, Swiggy, Amazon, FedEx).
- **Core Data**: AI has access to:
    - **Current Address**: e.g., "123 Galaxy Towers, Apartment 4B."
    - **Landmarks**: "Next to the central park gate."
    - **Instructions**: "Leave at the shoe rack outside" or "Hand over to the security guard."
- **AI Interaction**: When identifying a delivery driver, the AI immediately provides these details: "Hi, if this is for the pizza delivery, please leave it with the security guard at the gate. My flat is 4B, but I prefer a drop-off at the gate."

### 2.4 Contact-Specific AI Rules
- **Requirement**: Ability to tag specific contacts to *always* be handled by AI.
- **Use Case**: Filtering calls from specific service providers or persistent acquaintances without blocking them entirely.
- **Configuration**: In the "AI Contacts" tab, users can toggle "Always AI Answer" for individual contacts.

### 2.5 Dynamic Interaction Templates
- **Hardcoded Starters**:
    - *Unknown*: "Hello, this is Sanjana's assistant. Please state your name and purpose."
    - *Known*: "Hi {name}! Sanjana is a bit tied up right now. I'm her AI assistant. How can I help you today?"
- **Ending Statements**:
    - Standard: "I've logged your message for Sanjana. She'll get back to you soon. Goodbye!"
    - Delivery: "Thank you for the delivery! Please mark it as dropped off. Bye."

## 3. Live Interaction & Control

### 3.1 Direct Answer (Takeover) Notification
- **Action**: A specialized push notification sent via Firebase (FCM).
- **Interaction**: The notification includes two action buttons:
    1. **View Live**: Open the app to see the transcript.
    2. **Join Call**: Immediately bridges the user to the caller, terminating the AI's participation.

## 4. User Experience (UX) Architecture
- **Home (Calls)**: Live activity feed and DND toggle.
- **AI Contacts**: Rule management for specific numbers.
- **AI Tuning (Preferences)**: Central hub for address details and hardcoded templates.
- **Profile (You)**: Global account settings and connection status.

## 5. Non-Functional Requirements
- **Low Latency**: AI response time must be under 1.5 seconds to feel human.
- **Reliability**: If AI fails to connect, the system must fallback to a standard carrier voicemail.
- **Privacy**: End-to-end encryption for call transcripts stored in history.
