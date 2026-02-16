# HIFZ-AI System Architecture - v3.0

## Overview
This document outlines the v3.0 system architecture for HIFZ-AI, an intelligent platform designed to generate and adapt personalized Quran memorization plans for teachers. This version incorporates updated technology stacks, an advanced AI methodology, and enhanced integration capabilities.

## 1. Technology Stack

### 1.1 Frontend Framework
**Choice:** Next.js 15/16 (with Tailwind CSS v4 and TypeScript)

**Justification:**
-   **Next.js:** Provides robust framework for React applications, supporting server-side rendering (SSR), static site generation (SSG), and API routes, which are crucial for performance and SEO. Version 15/16 ensures access to the latest features and optimizations.
-   **Tailwind CSS v4:** Utility-first CSS framework for rapid and consistent UI development, ensuring a modern and responsive design.
-   **TypeScript:** Enhances code quality, maintainability, and developer experience by providing static type checking.

---

### 1.2 Backend Framework
**Choice:** Django 5.x

**Justification:**
-   **Django:** High-level Python web framework that encourages rapid development and clean, pragmatic design. It's well-suited for building complex, data-driven applications like HIFZ-AI.
-   **Batteries-included:** Offers an ORM, admin panel, authentication, and a robust ecosystem, significantly speeding up development.
-   **Python for AI:** Aligns well with the AI/ML components (DKT model) that will likely be developed in Python.
-   **RESTful API Development:** Django REST Framework (DRF) provides a powerful and flexible toolkit for building Web APIs.

---

### 1.3 Database
**Choice:** PostgreSQL

**Justification:**
-   **ACID Compliance:** Ensures data integrity, critical for tracking student progress and memorization data.
-   **Scalability & Performance:** Robust for handling large datasets and complex queries, essential for an AI-driven system.
-   **JSONB Support:** Useful for storing flexible data structures, potentially for AI model configurations or intermediate outputs.
-   **Maturity & Ecosystem:** Widely adopted, with extensive tooling and community support.

---

### 1.4 AI/ML Framework
**Choice:** PyTorch (for DKT model implementation)

**Justification:**
-   **Deep Learning Focus:** Excellent for implementing Recurrent Neural Networks (RNNs) and Long Short-Term Memory (LSTM) networks required for DKT.
-   **Flexibility & Control:** Provides a high degree of control over model architecture and training loops.
-   **Pythonic:** Seamless integration with Django backend components developed in Python.
-   **Community & Research:** Strong community, extensive documentation, and active research ecosystem.

---

## 2. System Architecture

### 2.1 High-Level Design
**Architecture Pattern:** Service-Oriented Architecture (SOA) with distinct Frontend, Backend, and AI Service layers.

**Layers:**
1.  **Presentation Layer (Frontend):** Next.js application, responsible for user interface, interaction, and data visualization.
2.  **Application Layer (Backend):** Django 5.x application, serving RESTful APIs, managing business logic, user authentication, and data persistence.
3.  **AI Service Layer:** Dedicated microservice (potentially a Flask/FastAPI app or integrated within Django) hosting the Deep Knowledge Tracing (DKT) model, responsible for knowledge state prediction and adaptation.
4.  **Data Layer:** PostgreSQL database, storing all application data, including student profiles, progress, Quran data, and model-specific features like verse difficulty.
5.  **External AI Context (OpenClaw/z.ai):** For LLM-based interactions and advanced contextual understanding.

---

### 2.2 API Structure (Django REST Framework)

#### RESTful Endpoints
-   **Authentication:** `/api/v1/auth/*`
-   **User Management:** `/api/v1/users/*`
-   **Memorization Plans:** `/api/v1/plans/*` (CRUD for plans, generation requests)
-   **Progress Tracking:** `/api/v1/progress/*` (Recitation records, assessment results)
-   **Quran Data:** `/api/v1/quran/*` (Verses, surahs, translations, difficulty scores)
-   **AI Predictions:** `/api/v1/ai/dkt/predict` (Endpoint for DKT model predictions)
-   **AI Contextualization:** `/api/v1/ai/llm/contextualize` (Endpoint for LLM interactions leveraging Context7)

---

### 2.3 Database Schema (PostgreSQL)

**Core Entities:**
-   **Users:** (Teachers, Students, Admins)
-   **Students:** (Linked to Users, stores DKT-specific state vector)
-   **Progress Records:** (Verse ID, Student ID, timestamp, outcome - e.g., correct/incorrect, confidence, duration)
-   **Memorization Plans:** (Student ID, start/end dates, allocated verses, due dates)
-   **Quran Verses:** (Verse ID, Surah ID, verse text, difficulty score - from `صعوبة الآيات` file)
-   **Surahs:** (Surah ID, name, number of verses)
-   **Knowledge Concepts:** (Granular topics for DKT if needed, e.g., specific Tajweed rules)

---

## 3. AI Model Pipeline (Deep Knowledge Tracing - DKT)

### 3.1 DKT Model
-   **Methodology:** Deep Knowledge Tracing (DKT) using Recurrent Neural Networks (RNNs), specifically Long Short-Term Memory (LSTM) networks.
-   **Purpose:** To continuously model and predict a student's evolving knowledge state and their probability of correctly recalling specific Quranic verses.
-   **Inputs:**
    -   Sequence of historical student interactions: (Verse ID, success/failure, timestamp, duration, confidence)
    -   **Verse Difficulty (`صعوبة الآيات`):** Integrated as a fundamental feature for each verse. The numerical difficulty score for each verse will be fed into the DKT model alongside student interaction data, allowing the model to weight predictions based on the inherent memorization challenge of the verse. This provides a more accurate and nuanced understanding of student progress and learning needs.
-   **Outputs:** A dynamic knowledge state vector for each student, representing their mastery across various Quranic memorization concepts (e.g., individual verses, groups of verses, surahs). This vector is used to predict the probability of successfully recalling any given verse.

### 3.2 Training Pipeline
-   **Data Sources:** Historical student performance data, anonymized memorization attempts, and the curated `صعوبة الآيات` dataset.
-   **Process:** Offline training of the DKT model using PyTorch, potentially leveraging transfer learning from pre-trained educational models if applicable.
-   **Deployment:** The trained model will be deployed as an inference service (e.g., using TorchServe or a custom Flask/FastAPI wrapper).

### 3.3 Real-Time Inference
-   **Endpoint:** `/api/v1/ai/dkt/predict`
-   **Functionality:** Upon a request (e.g., after a student recites a verse, or a teacher requests a plan adaptation), the DKT service will receive the student's latest progress and historical data to update their knowledge state and predict future recall probabilities.
-   **Performance:** Optimized for low-latency predictions to enable adaptive scheduling.

### 3.4 Adaptive Scheduling
-   **Mechanism:** The DKT model's predictions (recall probabilities, knowledge state) will directly inform the generation and adaptation of memorization plans. Verses with lower predicted recall probabilities will be scheduled for more frequent review, and the plan will adjust dynamically based on new student performance data and the associated verse difficulty.

---

## 4. Integration with OpenClaw (Context7)

**Objective:** Ensure the LLM (z.ai) has access to the full student history for personalized recommendations and plan generation, in conjunction with the DKT model's output.

**Mechanism:**
1.  **Data Retrieval:** When a teacher or system component requires LLM assistance for a specific student (e.g., generating tailored advice, explaining DKT predictions), the Django backend will retrieve the comprehensive student history from the PostgreSQL database. This history includes:
    *   Student's personal profile.
    *   All past memorization attempts (correct/incorrect, timestamps, confidence).
    *   Current memorization plan.
    *   The student's current DKT knowledge state vector.
    *   Relevant Quranic verse data, including difficulty scores from `صعوبة الآيات`.
2.  **Context Formatting:** The retrieved student history data will be dynamically formatted into a structured prompt or context block suitable for ingestion by an LLM. This could involve summarizing long sequences or extracting key patterns.
3.  **Context7 Injection:** The OpenClaw `Context7` feature will be utilized to inject this meticulously formatted student history directly into the context window of the LLM (z.ai) before it processes the primary user query (e.g., "Suggest how to help Student X with Surah Y").
    *   `Context7` acts as a conduit, ensuring that the LLM receives not just the immediate request but also a rich, factual, and up-to-date background of the student's learning journey and DKT model insights.
4.  **LLM Processing:** With this enhanced context, the LLM (z.ai) can then generate highly personalized, accurate, and relevant recommendations or plan adjustments, considering both the DKT model's predictive power and the nuanced details of the student's historical performance and the inherent difficulty of the verses.
5.  **Output Integration:** The LLM's response will be fed back to the Django backend for display in the teacher dashboard or for further processing to update plans.

This approach leverages `Context7` to bridge the gap between structured historical data in the database, the predictive power of DKT, and the natural language understanding and generation capabilities of an LLM, leading to a truly adaptive and intelligent tutoring system.

---

## 5. Persona-Specific Components

### 5.1 Student Portal (Next.js)
-   Personalized daily memorization plans
-   Interactive progress dashboard (visualizing DKT state, recall probabilities)
-   Practice recording and self-assessment tools
-   Milestone tracking and achievements

### 5.2 Teacher Dashboard (Next.js)
-   Multi-student progress monitoring (overview of DKT states, struggling students)
-   Adaptive plan adjustment interface (teacher can override DKT suggestions)
-   Detailed analytics and insights per student
-   LLM-powered recommendations (leveraging Context7 + DKT) for intervention strategies

### 5.3 Admin Panel (Django Admin)
-   Batch student management
-   System analytics and reporting
-   Configuration of global parameters (e.g., DKT model thresholds)
-   Management of Quranic data (verses, difficulty scores)

---

## 6. Deployment Considerations

### 6.1 Scalability
-   **Frontend:** Next.js can be deployed on Vercel or similar platforms for global CDN distribution and scalability.
-   **Backend:** Django application will be containerized (Docker) and deployed on a scalable cloud infrastructure (e.g., Kubernetes, AWS ECS/Fargate) with auto-scaling.
-   **AI Service:** DKT inference service will also be containerized and scaled independently based on demand.
-   **Load Balancing:** Nginx or cloud-native load balancers will distribute traffic.

### 6.2 Monitoring
-   Comprehensive logging (ELK stack or cloud-native logging services)
-   Metrics collection (Prometheus/Grafana or cloud-native monitoring) for application performance, DKT model latency/accuracy, and resource utilization.
-   Alerting for critical issues.

### 6.3 CI/CD Pipeline
-   Automated build, test, and deployment workflows using GitHub Actions or similar.
-   Containerization (Docker) for all services.
-   Staging and production environments for multi-stage deployment.

---

## 7. Security Considerations

-   **Authentication & Authorization:** JWT-based authentication for APIs, role-based access control (RBAC) managed by Django.
-   **Data Protection:** Encryption of sensitive student data at rest and in transit.
-   **Privacy (GDPR/Local Regulations):** Adherence to data privacy laws, anonymization of data for model training where necessary.
-   **API Security:** Rate limiting, input validation, protection against common web vulnerabilities (OWASP Top 10).

---

## 8. Performance Targets

-   **API Response:** P95 < 200ms for core business logic endpoints.
-   **DKT Inference:** P95 < 500ms for knowledge state updates and plan adaptation.
-   **System Uptime:** > 99.9%
-   **LLM Contextualization:** Response time for Context7 injection and LLM processing optimized for teacher workflow.

---

## 9. Technology Summary

| Component            | Technology                           | Justification                                    |
| :------------------- | :----------------------------------- | :----------------------------------------------- |
| Frontend             | Next.js 15/16, Tailwind CSS v4, TS   | Performance, modern UI, type safety              |
| Backend              | Django 5.x                           | Rapid development, Python ecosystem, robust APIs |
| Database             | PostgreSQL                           | Data integrity, scalability                      |
| AI Model (DKT)       | PyTorch                              | Deep learning, sequence modeling                 |
| Containerization     | Docker                               | Portability, consistent environments             |
| External AI Context  | OpenClaw (Context7) + z.ai (LLM)     | Enhanced LLM understanding with student history  |

---

**Document Version:** 3.0
**Last Updated:** 2026-02-16
**Author:** Gemini (AI Expert)
**Project:** HIFZ-AI - Personalized Quran Memorization Using AI
