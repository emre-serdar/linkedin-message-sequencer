# LinkedIn Message Sequencer

## 🔍 Overview

The **LinkedIn Message Sequencer** is a full-stack, containerized outreach automation tool that simulates personalized LinkedIn message campaigns using scheduled steps. While current message delivery and authentication are mocked (due to LinkedIn’s API restrictions), the system is structured in a way that it could be extended to use LinkedIn’s official Messaging and Sign-In APIs with minimal changes to the architecture.

---

## ⚙️ Architecture

| Layer        | Tech Stack                        | Description                                                                 |
|--------------|------------------------------------|-----------------------------------------------------------------------------|
| Frontend     | Next.js + TailwindCSS + TypeScript| Prospect upload, message sequence builder, and delivery dashboard          |
| Backend API  | Express.js                         | Campaign creation, mock login, DB ops, delivery tracking                   |
| Worker       | BullMQ + Redis                     | Schedules and sends messages based on delay per step (mocked logic)        |
| Database     | PostgreSQL                         | Stores campaigns, steps, prospects, delivery status, reply events          |
| Queue        | Redis                              | Manages delayed job scheduling and cancellation logic                      |
| DevOps       | Docker Compose                     | All services run in isolated containers, local-first setup                 |

---

## ✅ Features

- **CSV Upload & Validation**: Upload prospect lists and validate LinkedIn profile URLs
- **Sequence Builder**: Define a series of message steps with custom delays
- **Message Scheduling**: Delivers messages at future times via Redis-based job queues
- **Reply Simulation**: Stops all future messages to a prospect when they reply (with Redis & DB sync)
- **Status Dashboard**: View all jobs with real-time countdowns and status (PENDING, SENT, REPLIED, STOPPED)
- **Containerized Stack**: One-line setup via `docker-compose up`

---

## 🔐 Real-World LinkedIn API Integration Plan

This project is currently built with mock flows, but it's designed to be **directly compatible** with LinkedIn’s official APIs. Here’s how:

### 🔐 LinkedIn Login – Real Scenario

- LinkedIn has deprecated "Sign in with LinkedIn" in favor of **OpenID Connect**.
- Follow the [LinkedIn OAuth 2.0](https://learn.microsoft.com/en-us/linkedin/shared/authentication/authentication) flow:
  - Initiate 3-legged OAuth with scopes: `r_liteprofile`, `r_emailaddress`
  - User authenticates and consents, then you exchange the authorization code for an access token.
  - With the token, retrieve member details via:
    - `GET https://api.linkedin.com/v2/me` (returns id, firstName, lastName, profilePicture)
    - `GET https://api.linkedin.com/v2/emailAddress?q=members&projection=(elements*(handle~))`
- These endpoints provide all necessary identity data for sign-in and personalization.

### ✉️ LinkedIn Messages API – Real Scenario

- Use [Messages API](https://learn.microsoft.com/en-us/linkedin/shared/integrations/communications/messages) to send actual messages.
- Strict compliance rules apply:
  - Message **must be user-initiated** (not pre-scheduled).
  - Member must be presented with a **draft** and **manually send** the message.
  - HTML is not supported; plain text only.
- To send a message:
  ```http
  POST https://api.linkedin.com/v2/messages
  Authorization: Bearer {access_token}
  {
    "recipients": ["urn:li:person:abc123"],
    "body": "Hello!",
    "messageType": "MEMBER_TO_MEMBER"
  }
  ```
- Real integration requires elevated permissions (`w_member_messages`) granted via LinkedIn Partner Program.

### 🧠 Developer Note

This tool is currently operating with mock login and message delivery, but thanks to the modular backend design, real LinkedIn OAuth login and messaging can be integrated with minimal refactor. The `worker/` folder's BullMQ logic is queue-agnostic and easily extendable to external messaging APIs.

---

## 🛠 How BullMQ Works in This System

- **Job Creation**: When a campaign is created, each message step is scheduled as a delayed job using BullMQ's `.add()` method with a `delay` option.
- **Worker Execution**: The `worker/` service consumes the `send-linkedin-message` queue and runs a processor function that simulates message delivery.
- **Reply Logic**: When a mock reply occurs, the system updates the delivery record to `REPLIED` and cancels future jobs (both in Postgres and Redis using BullMQ `.remove()`).
- **Redis State**: Delayed jobs are stored in Redis as sorted sets, retrievable via `getDelayed()`.

This architecture allows future integration with **rate-limited real APIs** by simply replacing the mock processor logic.

---

## 🧪 Local Setup

```bash
git clone https://github.com/emre-serdar/linkedin-sequencer
cd linkedin-sequencer
docker-compose up --build
```

Access:
- Frontend → `http://localhost:3000`
- Backend API → `http://localhost:4000/api`
- Redis & Postgres auto-managed in containers

---

## 📂 Project Structure

```
.
├── client/               # Frontend - Next.js
├── server/               # Backend - Express API
├── worker/               # Background worker - BullMQ
├── docker-compose.yml    # Full stack container config
├── LICENSE               # Emre’s custom license
└── README.md             # This file
```

---

## 🙋 Author

**Emre Serdar**  
🌐 [www.emreserdar.com](http://www.emreserdar.com)
