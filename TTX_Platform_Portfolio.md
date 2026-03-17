# TTX Platform — Portfolio Document

---

## Project Name
**Codec WarRoom** (Tabletop Exercise Platform)

---

## One-Line Summary
A full-stack MERN web application that digitizes cybersecurity tabletop exercises — enabling facilitators to deliver real-time scenarios, score participant responses by effectiveness, and conduct live debriefs with remote or hybrid teams.

---

## Problem It Solves

Organizations running cybersecurity incident response drills face a common challenge:

- Exercises are run manually using printed materials, whiteboards, or spreadsheets
- No real-time scoring or instant feedback for participants
- Difficult to run with remote or distributed teams
- No centralized tracking of participant responses or performance
- Facilitators have no tools to control pacing, lock discussion phases, or present content live

**TTX Platform solves all of this** by providing a fully digital, real-time exercise environment for both facilitators and participants — from a single web application.

---

## Tech Stack

| Layer        | Technology                          |
|--------------|-------------------------------------|
| Frontend     | React.js, Tailwind CSS, CKEditor 5  |
| Backend      | Node.js, Express.js                 |
| Database     | MongoDB (Mongoose)                  |
| Real-time    | Socket.io                           |
| Auth         | JWT (JSON Web Tokens)               |

---

## Application Routes / URL Structure

### Facilitator (Authenticated)
| Route                              | Purpose                                      |
|------------------------------------|----------------------------------------------|
| `/login`                           | Facilitator login                            |
| `/register`                        | Facilitator registration                     |
| `/dashboard`                       | View and manage all exercises                |
| `/exercise/:id/build`              | Build Exercise — create injects, phases, artifacts |
| `/exercise/:id/control`            | Control Panel — run the live exercise session |

### Participant (No Auth Required)
| Route                              | Purpose                                      |
|------------------------------------|----------------------------------------------|
| `/participant/join`                | Join exercise via access code                |
| `/participant/exercise/:id`        | Participant live dashboard                   |

---

## Core User Flows

### Facilitator Flow

```
1. Register / Login
        |
2. Create Exercise
   - Set title, description, max participants
   - Auto-generate unique access code
        |
3. Build Exercise (Build Tab)
   - Add Injects (scenario events)
     - Write narrative (rich-text with CKEditor)
     - Upload artifacts (logs, alerts, network captures, documents)
     - Add phases with questions and options
       - Each option has points + effectiveness label
       - Mark correct answer(s)
        |
4. Run Exercise (Control Panel)
   - Monitor → Admit waiting participants
   - Release injects to participants (live via Socket.io)
   - Open / Close response submissions
   - Lock phase progression for team discussion
   - Unlock to let participants advance
   - View live scores and all participant responses
   - Presentation Mode → Project questions + reveal correct answers
   - Summary Tab → Add rich-text debrief notes per phase
```

### Participant Flow

```
1. Go to /participant/join
   - Enter access code + name + team
        |
2. Wait for admission (facilitator admits from Control Panel)
        |
3. Receive inject (real-time countdown on screen)
   - Read scenario narrative (typewriter animation)
   - Review artifacts (logs, alerts, etc.)
        |
4. Answer phase questions
   - Single choice / Multiple choice / Text response
   - Submit answer → instant score feedback
   - See effectiveness label (Most Effective / Effective / etc.)
        |
5. Advance to next phase (when unlocked by facilitator)
        |
6. Repeat for each inject until exercise ends
```

---

## Key Features

| Feature                    | Details                                                                 |
|----------------------------|-------------------------------------------------------------------------|
| Real-time inject delivery  | Facilitator releases scenario — all participants receive it simultaneously with a 3-second countdown |
| Phase-based questioning    | Each inject has phases (e.g. Triage, Detection, Response) — participants progress sequentially |
| Effectiveness scoring      | Each answer option carries points and a magnitude label — Most Effective, Effective, Not Effective, Somewhat Effective, Least Effective |
| Discussion lock            | Facilitator can pause phase progression for team discussion, then unlock to resume |
| Live scoring               | Scores update in real-time via Socket.io as participants submit answers |
| Participant management     | Admit, reject, or remove participants; view all responses and scores |
| Presentation mode          | Facilitator can project questions live and reveal correct answers to the room |
| Rich-text exercise builder | CKEditor 5 for narrative and summary content — supports headings, lists, tables, images |
| Exercise summary           | Post-exercise debrief notes authored by facilitator, viewable per phase |
| Artifacts system           | Attach log files, alerts, network captures, documents to each inject as evidence for participants |
| Persistent timer           | Per-participant session timer stored in localStorage — survives page refreshes |
| Socket reconnection        | Participants automatically reconnect and restore session on network drop |

---

## Data Model Overview

```
Exercise
  |-- Injects[]
        |-- Artifacts[]        (log, alert, network, document)
        |-- Phases[]
              |-- question
              |-- options[]    (id, text, points, magnitude)
              |-- questionType (single / multiple / text)
              |-- correctAnswer[]

Participant
  |-- exercise (ref)
  |-- responses[]
        |-- injectNumber
        |-- phaseNumber
        |-- questionIndex
        |-- answer
        |-- pointsEarned
        |-- magnitude
  |-- totalScore
  |-- currentPhase
  |-- status (waiting / active / left)
```

---

## Real-time Events (Socket.io)

| Event                     | Direction              | Purpose                                      |
|---------------------------|------------------------|----------------------------------------------|
| `injectReleased`          | Server → Participants  | New inject delivered to all participants     |
| `responsesToggled`        | Server → Participants  | Open or close answer submissions             |
| `phaseProgressionToggled` | Server → Participants  | Lock or unlock phase advancement             |
| `scoreUpdate`             | Server → All           | Broadcast score after each submission        |
| `participantJoined`       | Server → Facilitator   | Notify facilitator of new participant        |
| `participantAdmitted`     | Server → Participant   | Notify participant they have been admitted   |
| `participantTerminated`   | Server → Participant   | Notify participant they have been removed    |

---

## Live Demo

| Role          | URL                                                     |
|---------------|---------------------------------------------------------|
| Facilitator   | https://ttx.cyberpull.space/facilitator/login           |
| Participant   | https://ttx.cyberpull.space/participant/join            |

---

## Project Type
- **Client Project** — built for cybersecurity training organizations
- **Full-stack solo build** — architecture, backend, frontend, real-time layer

---
