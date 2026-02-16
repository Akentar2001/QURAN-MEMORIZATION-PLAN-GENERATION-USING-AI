# 1.1. Research Context & Problem Definition

## 1.1. Introduction
In many traditional Quran learning environments, students are expected to follow a fixed memorization schedule, which doesn't account for their unique abilities. As a result, some students may struggle to keep up, while others aren't being challenged enough. This project explores how AI can offer a more personalized approach to Quran memorization, improving learning experience for each student.

## 1.2. Aim
This project aims to propose and design a machine-learning model that provides personalized and adaptive Quran memorization plans for individual students. Using artificial intelligence, system will analyze user-specific data, such as current memorization level and student performance, to create an efficient, manageable, and flexible memorization plan. The goal is to enhance students' progress through optimized scheduling, making memorization more structured, personalized, and achievable.

## 1.3. Problem Definition

### The Challenge
Memorizing Quran is a cherished tradition in Islam, with countless Muslims dedicating themselves to this sacred pursuit. However, in today's world, memorizing Quran presents significant challenges for students. Most Quran memorization programs follow fixed schedules that do not account for individual differences in learning abilities.

### Key Issues

#### 1. Fixed Schedules Don't Work for Everyone
Students with varying memorization speeds, cognitive abilities, and learning preferences are forced to follow a standardized approach that may not suit their unique needs.

**Slow Learners:**
- Fall behind due to limited time, weaker memorization ability, or slower speed
- Become discouraged and less motivated
- Lose confidence and progress

**Fast Learners:**
- Find themselves under-challenged
- Experience disengagement and limited learning
- Not reaching their full potential

#### 2. Retention is Not Addressed
Even if students manage to memorize new material, retaining it over time requires regular revision.

**Traditional Systems Problems:**
- Fixed revision schedules don't consider individual retention capabilities
- Students forget due to inadequate review
- Students waste time on verses already mastered

#### 3. Lack of Intelligent Feedback
Teachers often rely on subjective judgment to assess progress.

**Issues:**
- No structured way to adjust plans based on performance
- Subjective and inconsistent assessments
- Students stuck in ineffective learning patterns

### The Solution Gap
There's a growing need for an intelligent system to offer a more personalized approach to Quran memorization. AI and ML technologies have the potential to transform this process by:

- Analyzing individual learning patterns
- Generating tailored memorization plans
- Assessing current level, pace, and performance
- Adjusting memorization and revision schedules dynamically
- Ensuring appropriate level of challenge and support
- Enhancing long-term retention through customized revision strategies

## 1.4. Target Users

### Primary Users
1. **Students** - Quran memorization learners
2. **Teachers/Instructors** - Tracking and guiding student progress
3. **Parents** - Monitoring their children's progress
4. **Mosque/Islamic Center Administrators** - Managing programs

---

**Source:** CPCS499-C16-Final Report - Research Context & Problem Definition  
**Date:** 2025-01-09  
**Project:** HIFZ-AI - Personalized Quran Memorization Plans Using AI

## 1.5. Target Users - Detailed Personas

### 1. Students of Quran Memorization
**Individuals of all ages and backgrounds aiming to memorize Quran, whether beginners, intermediates, or advanced learners.**

**Characteristics:**
- Vary in memorization speed (slow, medium, fast)
- Different learning abilities and cognitive styles
- Varying daily availability (some have 30min, some have 2+ hours)
- Different starting points (complete beginners vs. already memorized portions)

**Why Personalization is Critical:**
- One-size-fits-all schedules don't accommodate their diverse needs
- Some need more repetition, others need more challenge
- Time constraints vary significantly
- Learning pace differs based on age, experience, and natural ability

**Key Pain Points:**
- Fixed schedules cause frustration (too fast or too slow)
- No guidance on what to review vs. what to memorize
- Lack of progress tracking leads to loss of motivation
- Don't know if they're making progress at an optimal rate

---

### 2. Quran Teachers/Instructors
**Educators who supervise students' Quran memorization and need tools to track progress effectively.**

**Characteristics:**
- Manage multiple students simultaneously
- Need objective performance metrics
- Rely on subjective judgment currently
- Want to provide personalized guidance but lack tools

**What They Need from HIFZ-AI:**
- Real-time student progress tracking
- Performance insights and analytics
- Data-driven recommendations for each student
- Ability to adjust learning strategies based on objective data
- Identification of students needing extra help

**Key Benefits:**
- Make informed decisions about teaching strategies
- Provide personalized attention where needed
- Track improvement over time
- Reduce subjectivity in assessments

---

### 3. Islamic Educational Institutions
**Islamic schools, madrasahs, and online Quran learning platforms seeking modern tools.**

**Characteristics:**
- Manage large groups of students
- Want to improve overall learning outcomes
- Need scalable solutions
- Looking for competitive advantage through technology

**What They Need from HIFZ-AI:**
- Institutional-level analytics and reporting
- Batch student management capabilities
- Integration with existing curriculum
- Progress tracking across multiple teachers
- Standardized but personalized learning paths

**Key Benefits:**
- Better student retention and success rates
- Data-driven curriculum improvements
- Competitive advantage through AI-powered tools
- Scalable personalized education

---

### 4. Parents/Guardians
**Those responsible for guiding their children through Quran memorization journey.**

**Characteristics:**
- Often not Quran experts themselves
- Want to support but don't know how
- Seek structure and guidance
- Want to ensure their children progress effectively

**What They Need from HIFZ-AI:**
- Clear view of child's progress and achievements
- Structured, personalized plans for their children
- Guidance on how to support the learning process
- Alerts when child needs extra help or encouragement
- Milestone tracking and celebration opportunities

**Key Benefits:**
- Peace of mind about child's progress
- Clear understanding of what their child should be doing
- Ability to provide meaningful support
- Reduced anxiety about child's memorization journey

---

## 1.6. User Needs Summary

| User Group | Primary Need | Personalization Critical Because |
|------------|---------------|--------------------------------|
| **Students** | Matched pace & clear direction | Speed, ability, time availability vary |
| **Teachers** | Objective tracking & insights | Need data to guide multiple students |
| **Institutions** | Scalable personalized education | Large student groups, diverse needs |
| **Parents** | Progress visibility & support | Need to guide children effectively |

---

**Source:** CPCS499-C16-Final Report - Target Users & Personas  
**Date:** 2025-01-09  
**Project:** HIFZ-AI - Personalized Quran Memorization Plans Using AI

---

## 1.7. Suggested Solution

The proposed solution is an AI-based Quran Memorization Plan Generator that designs personalized memorization and revision plans based on a student's unique learning profile, performance data, and retention ability.

The system will analyze user-specific inputs such as current memorization level, daily availability, and revision needs, to generate and adapt a flexible memorization plan that balances new verses with structured revision.

### 1.7.1. Key Features of Suggested Solution

**1. Personalized Memorization Plans**
Create customized plans for each student, considering their pace, availability, and progress.
- System generates new verses to memorize
- Alongside minor and major revisions
- Based on what student has already memorized

**2. Performance-Based Adjustments**
The AI model adjusts memorization and revision plans automatically based on student's performance.
- **Factors considered:** Speed, accuracy, retention rates
- **Adaptation:** Scale up or slow down workload to match students' capabilities
- **Outcome:** Dynamic adjustments ensure optimal challenge level

**3. Adaptive Revision Plans**
The system ensures that students regularly review previously memorized verses.
- Uses personalized intervals for revision
- **Minor revisions:** Cover recently memorized verses
- **Major revisions:** Periodic review of larger portions for long-term retention

**4. Flexible and Dynamic Scheduling**
The system adapts to changes in student's availability or challenges.
- Allows pausing, adjusting, or modifying memorization plans
- Maintains progress tracking
- Accommodates life events and varying schedules

---

## 1.8. Initial System Overview

The project focuses on developing an AI model that generates personalized Quran memorization plans based on a student's performance data.

**Note:** The model will operate without a complex system or UI, but with a simple interface to input performance data and output next memorization plan.

### 1.8.1. Objective

The AI model will create three types of plans:

| Plan Type | Purpose | Scope |
|-----------|----------|--------|
| **New Memorization Plan** | Assign new Quranic verses to memorize | Daily/weekly verses |
| **Minor Revision Plan** | Focus on reinforcing recently memorized portions | Short-term memory reinforcement |
| **Major Revision Plan** | Periodic review of larger sections for long-term retention | Comprehensive review of memorized Quran |

### 1.8.2. Key Functionalities

**1. Initial Training on Historical Data**
- **Dataset:** Contains records of student recitations
- **Purpose:** Model learns patterns from past performances
- **Outcome:** Understanding typical learning curves and common mistakes

**2. Real-Time Plan Adaptation**
- **Trigger:** After each student's recitation
- **Analysis:** Performance data (mistakes, validity)
- **Action:** Adjust future memorization and revision plans

**3. Dynamic Plan Generation**
- **Process:** Continuously refines predictions
- **Based on:** Ongoing performance tracking
- **Output:** New, minor, and major revision plans

### 1.8.3. Input Data

**Training Dataset**
Contains recitation records of students, with details:
- Portion requested for recitation
- Number of mistakes made
- Whether recitation was accepted as valid

**Real-Time Performance Data**
Captured after each recitation session, used to modify student's plans:
- Performance on most recent recitation
- Mistake count
- Feedback on validity of recitation

### 1.8.4. Output

**1. Memorization Plan**
- Assigns new Quranic verses based on student's capacity
- Considers pace, time availability, and previous performance

**2. Minor Revision Plan**
- Suggests portions of recently memorized content for revision
- Reinforces short-term memory
- Focuses on recently learned verses

**3. Major Revision Plan**
- Periodically suggests larger sections for review
- Supports long-term retention
- Covers significant portions of memorized Quran

### 1.8.5. Development Activities

#### 1.8.5.1. Requirements Specification
- **Identify key metrics:** Number of mistakes, pace of recitation, memorization capacity
- **Define adjustment frequency:** How often plans should change based on recitation feedback

#### 1.8.5.2. Data Collection & Preprocessing
**Data Collection:**
- Collect historical data on student recitations
- Include mistakes and feedback

**Data Preprocessing:**
- Clean and structure dataset
- Ensure consistent input for model training
- Handle missing data
- Normalize performance metrics
- Organize data by individual student records

#### 1.8.5.3. AI Model Design and Training
**Model Selection:**
- Choose appropriate machine learning model (decision tree, neural network)
- Must handle sequential data for learning progression and retention patterns

**Training:**
- Use preprocessed dataset to train AI model
- Model learns from past performance data
- Identifies trends in:
  - Student memorization speed
  - Error rates
  - Retention patterns

#### 1.8.5.4. Model Testing and Validation
**Testing:**
- Validate AI model using unseen data
- Ensures accurate memorization plans
- Verifies plan adjustments based on student performance

**Evaluation Metrics:**
- Accuracy in predicting next verses
- F1-score for mistake prediction
- Ensures robustness and reliability

#### 1.8.5.5. Real-Time Plan Adjustment Implementation
**Integration:**
- Feedback loop with new student performance data
- Data fed into model after each recitation
- Real-time updates to memorization and revision plans

**Performance Monitoring:**
- Continuously monitor model's predictions
- Ensures plans effectively adapt to student's learning pace
- Detects and corrects prediction drift

#### 1.8.5.6. Continuous Learning & Improvement
**Approach:**
- Use reinforcement learning or similar approach
- Enables AI model to learn and improve predictions over time

**Feedback Source:**
- Real-time recitations and evaluations
- Continuous improvement loop
- Adaptive to individual student patterns

---

**Source:** CPCS499-C16-Final Report - Suggested Solution & System Overview  
**Date:** 2025-01-09  
**Project:** HIFZ-AI - Personalized Quran Memorization Plans Using AI
