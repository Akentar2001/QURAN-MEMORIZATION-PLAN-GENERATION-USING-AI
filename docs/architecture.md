# HIFZ-AI System Architecture

## Overview
This document describes the system architecture for HIFZ-AI - an intelligent, personalized Quran memorization system using AI and machine learning.

## 1. Technology Stack

### 1.1 Backend Framework
**Choice:** Node.js (Express.js)

**Justification:**
- Mature ecosystem with extensive libraries
- Non-blocking I/O (ideal for real-time AI inference)
- Strong community support
- Good performance for ML model serving
- RESTful API development is straightforward

**Alternatives Considered:**
- Python (Django/FastAPI) - Good, but Node.js better for ML integration
- Go (Gin) - Excellent performance, but smaller ecosystem

---

### 1.2 Frontend Framework
**Choice:** React.js

**Justification:**
- Component-based architecture (reusable UI components)
- Large community and ecosystem
- Excellent state management (Redux/Context API)
- Strong testing support (Jest, React Testing Library)
- Virtual DOM enables efficient rendering
- Good for responsive, mobile-first design

**Alternatives Considered:**
- Vue.js - Good, but React has larger ecosystem
- Svelte - Fast, but smaller ecosystem
- Angular - Too opinionated and steep learning curve

---

### 1.3 Database
**Choice:** PostgreSQL

**Justification:**
- ACID compliance (critical for student progress data)
- Strong performance for complex queries
- Support for JSONB (for storing ML model outputs if needed)
- Excellent full-text search (for Quran verse lookup)
- Mature and battle-tested
- Strong replication and backup support

**Alternatives Considered:**
- MongoDB - Flexible, but less structured query capabilities
- MySQL - Good, but PostgreSQL has better advanced features
- SQLite - Lightweight, but not suitable for production scale

---

### 1.4 ML Framework
**Choice:** PyTorch

**Justification:**
- Excellent for sequential data (student performance over time)
- Strong support for RNN/LSTM architectures
- PyTorch Lightning for training pipeline
- TorchScript for model deployment (optimized inference)
- Active community and extensive documentation
- Good performance on both CPU and GPU

**Alternatives Considered:**
- TensorFlow - Mature, but PyTorch more research-friendly
- Scikit-learn - Good for traditional ML, less for deep learning
- Keras - Abstraction over TensorFlow, less control

---

## 2. System Architecture

### 2.1 High-Level Design
**Architecture Pattern:** Layered Microservices

**Layers:**
1. **Presentation Layer** - Frontend web application (React)
2. **API Gateway** - RESTful API with authentication and rate limiting
3. **Business Logic Layer** - Core microservices (Plan Generation, Progress Tracking, User Management)
4. **Data Access Layer** - PostgreSQL database with connection pooling
5. **ML Inference Layer** - PyTorch model serving with Redis caching
6. **Infrastructure Layer** - Docker containers, Nginx load balancer

**Component Communication:**
- All services communicate via RESTful JSON APIs
- Async communication using message queue (RabbitMQ/Redis)
- Circuit breaker pattern for fault tolerance

---

### 2.2 API Structure

#### RESTful Endpoints

**Authentication:**
- `POST /api/v1/auth/register` - User registration
- `POST /api/v1/auth/login` - User login
- `POST /api/v1/auth/logout` - User logout

**User Management:**
- `GET /api/v1/users/:id` - Get user profile
- `PUT /api/v1/users/:id` - Update user profile
- `GET /api/v1/users/:id/progress` - Get user progress summary

**Plan Generation (Core Feature):**
- `POST /api/v1/plans/generate` - Generate personalized plan
- `GET /api/v1/plans/:userId/active` - Get active plan
- `PUT /api/v1/plans/:id/adjust` - Manually adjust plan
- `POST /api/v1/plans/:id/feedback` - Submit practice feedback

**Progress Tracking:**
- `POST /api/v1/progress/record` - Record practice session
- `GET /api/v1/progress/:userId/history` - Get progress history
- `GET /api/v1/progress/:userId/analytics` - Get performance analytics

**Quran Data:**
- `GET /api/v1/quran/surahs` - List all Surahs
- `GET /api/v1/quran/verses/:surahId` - Get verses in a Surah
- `GET /api/v1/quran/juz` - List all Juz

**Institutional:**
- `POST /api/v1/institutions/classes` - Create class
- `GET /api/v1/institutions/:id/analytics` - Get institutional analytics
- `GET /api/v1/institutions/:id/reports` - Generate reports

---

### 2.3 Database Schema

#### Core Entities

**Users:**
```sql
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL, -- student, teacher, parent, admin
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_username ON users(username);
```

**Progress Tracking:**
```sql
CREATE TABLE progress_records (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    verses_memorized INTEGER NOT NULL,
    verses_reviewed INTEGER NOT NULL,
    mistakes_count INTEGER NOT NULL,
    confidence_level INTEGER CHECK (confidence_level BETWEEN 1 AND 10),
    time_spent_minutes INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_progress_user_date ON progress_records(user_id, date);
CREATE INDEX idx_progress_date ON progress_records(date);
```

**Plans:**
```sql
CREATE TABLE plans (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(20) NOT NULL, -- new_memorization, minor_revision, major_revision
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    daily_target_verses INTEGER NOT NULL,
    plan_json JSONB NOT NULL, -- detailed plan breakdown
    status VARCHAR(20) DEFAULT 'active', -- active, paused, completed
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_plans_user ON plans(user_id);
CREATE INDEX idx_plans_status ON plans(status, start_date);
```

**Quran Data:**
```sql
CREATE TABLE quran_verses (
    id SERIAL PRIMARY KEY,
    surah_id INTEGER NOT NULL,
    verse_number INTEGER NOT NULL,
    arabic_text TEXT NOT NULL,
    translation_en TEXT,
    difficulty_level VARCHAR(10), -- easy, medium, hard
    average_mistakes DECIMAL(5,2),
    word_count INTEGER,
    tajweed_rules JSONB
);

CREATE TABLE quran_surahs (
    id SERIAL PRIMARY KEY,
    surah_number INTEGER UNIQUE NOT NULL,
    name_arabic VARCHAR(100) NOT NULL,
    name_english VARCHAR(100),
    verses_count INTEGER,
    place_of_revelation VARCHAR(50)
);

CREATE INDEX idx_quran_surah_number ON quran_surahs(surah_number);
CREATE INDEX idx_quran_verses_surah ON quran_verses(surah_id, verse_number);
```

---

## 3. ML Model Pipeline

### 3.1 Training Pipeline

**Data Sources:**
- Historical student performance data from PostgreSQL
- Public Quran datasets (text, audio, Tajweed annotations)
- Synthetic data augmentation for edge cases

**Preprocessing:**
```python
# Data cleaning and normalization
- Handle missing values
- Normalize time measurements (seconds per verse)
- Encode categorical variables (difficulty level, tajweed rules)
- Feature engineering: rolling averages, performance trends
```

**Training:**
```python
# Model training with PyTorch
from torch import nn, optim

class MemorizationPredictor(nn.Module):
    def __init__(self, input_size, hidden_size, output_size):
        super(MemorizationPredictor, self).__init__()
        self.lstm = nn.LSTM(input_size, hidden_size, batch_first=True)
        self.fc = nn.Linear(hidden_size, output_size)
    
    def forward(self, x):
        lstm_out, _ = self.lstm(x)
        predictions = self.fc(lstm_out[:, -1, :])
        return predictions

# Training hyperparameters
- Learning rate: 0.001
- Batch size: 32
- Epochs: 100
- Optimizer: Adam
- Loss function: CrossEntropy
```

### 3.2 Real-Time Inference

**API Endpoint:**
- `POST /api/v1/ml/predict` - Get personalized plan

**Request Body:**
```json
{
  "user_id": 123,
  "recent_performance": [
    {
      "date": "2025-01-09",
      "verses_memorized": 5,
      "mistakes": 1,
      "time_minutes": 15
    }
  ],
  "time_available_minutes": 45,
  "current_level": "beginner"
}
```

**Response:**
```json
{
  "plan": {
    "type": "new_memorization",
    "daily_target_verses": 5,
    "verses": ["2:1", "2:2", "2:3", "2:4", "2:5"],
    "estimated_time_minutes": 30
  },
  "confidence": 0.87
}
```

**Performance Requirements:**
- Inference latency: <2 seconds per request
- Batch processing: Support 1000+ students simultaneously
- GPU acceleration: Optional, use when available

### 3.3 Feedback Loop for Continuous Learning

**Data Collection:**
- Automatic collection after each practice session
- Teacher manual adjustments (overrides AI recommendations)
- Student self-reported confidence levels

**Model Update Strategy:**
```python
# Incremental vs. Full Retraining
if new_samples > 1000:
    # Retrain model weekly
    approach = "full_retraining"
elif new_samples > 100:
    # Fine-tune with recent data
    approach = "incremental_learning"
else:
    # Use cached model
    approach = "cached"
```

**Learning Rate Adaptation:**
- High error rate → Increase revision frequency
- Low error rate → Increase memorization pace
- Streak of good performance → Increase challenge

---

## 4. Persona-Specific Components

### 4.1 Student Portal
**Features:**
- Daily memorization and revision plan display
- Progress dashboard with charts (progress over time, streak days)
- Milestone celebrations (Juz completion, Surah completion)
- Practice session recording
- Confidence level reporting (1-10 scale)

**UI Components:**
- Plan card: Today's target vs. completed
- Progress chart: Line chart showing verses memorized over time
- Practice timer: For focused memorization sessions
- Badges/Achievements: Visual gamification

---

### 4.2 Teacher Dashboard
**Features:**
- Multi-student list with filtering (by progress level, class)
- Individual student progress details
- One-click plan adjustment
- Performance comparison view (scatter plot: pace vs. accuracy)
- Alert system for at-risk students

**Analytics:**
- Class average vs. individual student
- Trend indicators (improving, declining, stable)
- Export to CSV/Excel for reports

---

### 4.3 Admin Panel
**Features:**
- Batch student management (create/update/delete)
- Class management (assign teachers, bulk student assignment)
- Program-wide analytics dashboard
- Report generation (Student Progress, Class Performance, Institutional Summary)
- Custom KPI configuration

**Scalability Considerations:**
- Pagination for large datasets (1000+ students)
- Caching layer (Redis) for frequently accessed data
- Background job queue for heavy operations

---

### 4.4 Parent View
**Features:**
- Child progress overview (dashboard)
- Weekly progress summary email
- "Falling Behind" alerts (email, push notification)
- Milestone celebration notifications
- Home practice guide and tips

**Privacy Controls:**
- Parent can choose notification frequency
- Child can set minimal involvement mode
- Opt-out options for privacy

---

## 5. Deployment Considerations

### 5.1 Scalability

**Horizontal Scaling:**
- Load balancer (Nginx) distributing requests across API instances
- Database read replicas for query performance
- Auto-scaling container instances based on CPU/memory usage
- Target: Support 10,000+ concurrent students

**Load Balancing Strategy:**
- Round-robin for even distribution
- Health checks with automatic failover
- Session affinity for user consistency

---

### 5.2 Monitoring

**Application Logging:**
- Structured logging (JSON format)
- Log levels: ERROR, WARN, INFO, DEBUG
- Centralized log aggregation (ELK stack: Elasticsearch, Logstash, Kibana)

**Metrics Collection:**
- API response times (P50, P95, P99)
- Database query performance
- ML inference latency
- Error rates and types

**Alerting:**
- API error rate >1%
- Database connection failures
- ML model performance degradation
- Infrastructure issues (high CPU, memory >80%)

---

### 5.3 CI/CD Pipeline

**Testing:**
- Unit tests (Jest) for each microservice
- Integration tests for API contracts
- E2E tests for critical user flows

**Deployment:**
- Docker containerization
- GitHub Actions for CI/CD
- Multi-stage deployment (dev → staging → production)
- Automated rollback on failure

**Rollback Strategy:**
- Blue-green deployment for zero-downtime updates
- Database migrations with rollback support
- Feature flags for gradual rollout

---

## 6. Security Considerations

### 6.1 Authentication & Authorization
- JWT tokens for API authentication
- Role-based access control (RBAC)
- Password hashing (bcrypt)
- Rate limiting per user/IP

### 6.2 Data Protection
- Encryption at rest (PostgreSQL TDE)
- HTTPS/TLS for all communications
- Input validation and sanitization
- SQL injection prevention (parameterized queries)

### 6.3 Privacy (GDPR/Children's Online Privacy Protection Act)
- Minimal data collection (only what's necessary)
- Parental consent for students under 13
- Data export and deletion on request
- Privacy policy accessible in UI

---

## 7. Performance Targets

### 7.1 API Performance
- P50 response time: <500ms for plan generation
- P95 response time: <1000ms for all endpoints
- 99.9% uptime SLA
- Support 1000+ concurrent users

### 7.2 ML Performance
- Inference latency: <2 seconds
- Training time: <4 hours for full model retrain
- Model accuracy: >85% on test dataset
- Real-time adaptions: <30 seconds to adjust based on new performance data

### 7.3 Database Performance
- Query P50: <100ms for indexed queries
- Connection pooling: Max 20 concurrent connections
- Index hit rate: >95%

---

## 8. Technology Summary

| Component | Technology | Justification |
|-----------|-----------|---------------|
| **Backend** | Node.js + Express.js | Mature ecosystem, non-blocking I/O |
| **Frontend** | React.js | Component-based, large community, responsive design |
| **Database** | PostgreSQL | ACID compliance, excellent performance |
| **ML Framework** | PyTorch | Best for sequential data, strong RNN/LSTM support |
| **API Gateway** | Nginx | Proven load balancer |
| **Message Queue** | Redis | Fast, reliable, good for async tasks |
| **Containerization** | Docker + Docker Compose | Industry standard, easy deployment |
| **CI/CD** | GitHub Actions | Integrated with GitHub, free |
| **Monitoring** | ELK Stack | Comprehensive logging and analytics |

---

## 9. Next Steps for Development

**Sprint 1: Foundation (Week 1-2)**
1. Set up project structure and CI/CD pipeline
2. Implement authentication and user management
3. Design and implement database schema
4. Set up monitoring and logging infrastructure

**Sprint 2: Core Features (Week 3-4)**
1. Implement plan generation algorithm (initial heuristic version)
2. Build progress tracking API
3. Implement Quran data management
4. Create student portal basic UI

**Sprint 3: ML Integration (Week 5-6)**
1. Train initial ML model on historical data
2. Implement real-time inference API
3. Build feedback loop for continuous learning
4. Implement adaptive revision scheduling

**Sprint 4: Advanced Features (Week 7-8)**
1. Implement teacher dashboard
2. Build admin panel with analytics
3. Add parent view with notifications
4. Implement advanced ML features (reinforcement learning)

**Sprint 5: Polish & Optimization (Week 9-10)**
1. Performance optimization and caching
2. Comprehensive testing (unit, integration, E2E)
3. Security audit and hardening
4. Documentation and deployment

---

## Appendix: Key Design Decisions

### A. Why Monolithic vs. Microservices?
**Decision:** Layered Microservices (not pure microservices, not monolithic)
**Rationale:**
- Balance between development speed and architectural clarity
- Services are loosely coupled via APIs
- Can scale individual components independently
- Easier to test and deploy than pure microservices
- Simpler than monolith for a startup project

### B. Why PyTorch vs. TensorFlow?
**Decision:** PyTorch
**Rationale:**
- Research community prefers PyTorch
- Better support for custom RNN architectures
- PyTorch Lightning simplifies training pipeline
- TorchScript enables optimized inference

### C. Why PostgreSQL vs. MongoDB?
**Decision:** PostgreSQL
**Rationale:**
- Need strong query capabilities for analytics
- ACID compliance is critical for progress data integrity
- Relational model fits user, progress, plans structure naturally
- JSONB can be added later if needed for unstructured data

### D. Why React vs. Other Frontend Frameworks?
**Decision:** React
**Rationale:**
- Largest ecosystem and community support
- Component reusability saves development time
- Virtual DOM provides good performance
- Strong testing infrastructure (Jest, React Testing Library)
- Team expertise (more familiar than Vue/Svelte)

---

**Document Version:** 1.0  
**Last Updated:** 2025-01-09  
**Author:** ATLAS (Architect)  
**Project:** HIFZ-AI - Personalized Quran Memorization Using AI
