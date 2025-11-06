# Front-End Specification: Course Pages UX Redesign

## 1. Introduction

This document defines the user experience goals, information architecture, user flows, and visual design specifications for the EnactOn Training's course interface. It serves as the foundation for visual design and frontend development, ensuring a cohesive and user-centered experience.

### 1.1. Overall UX Goals & Principles

*   **Target User Personas:**
    *   **Trainee/Employee:** The primary user. Wants to easily find and complete assigned or relevant courses to build skills. Values clarity, progress tracking, and a clear path to completion.
    *   **Manager/Team Lead:** Needs to assign courses, track team member progress, and evaluate performance. Values efficiency and clear reporting.
*   **Usability Goals:**
    *   **Clarity:** Users should immediately understand how to find, start, and continue their courses.
    *   **Efficiency:** Completing common tasks (like starting the next module) should require minimal clicks.
    *   **Engagement:** The interface should feel modern, responsive, and encouraging to promote course completion.
*   **Design Principles:**
    1.  **Focus on the Next Step:** Always guide the user to the most logical next action.
    2.  **Progressive Disclosure:** Show essential information first. Reveal details as needed to avoid overwhelming the user.
    3.  **Visual Cohesion:** Use a consistent and modern design language across all learning-related components.

### 1.2. Change Log

| Date       | Version | Description                 | Author |
| :--------- | :------ | :-------------------------- | :----- |
| 2025-09-19 | 1.0     | Initial draft of the spec.  | Sally  |

## 2. Key Screen Layouts & Component Changes

This section details the specific changes for the `Courses` and `CourseDetails` pages.

### 2.1. Screen: Courses List Page (`/courses`)

**Purpose:** To provide a clean, scannable overview of all available courses, allowing users to quickly find and access them.

**Component Spec: `CourseCard.tsx`**

The current `CourseCard` is too dense. It will be simplified to focus on discoverability and a single, clear action.

*   **Visual Redesign:**
    *   The card will have a cleaner layout, with more white space.
    *   The `type` and `difficulty` badges will be visually less prominent but still accessible.
    *   A primary status badge ("Enrolled", "Completed", "Not Enrolled") will be added for immediate recognition.
*   **Information Hierarchy:**
    1.  **Course Title:** Remains the most prominent element.
    2.  **Primary Status Badge:** Clearly indicates the user's relationship to the course.
    3.  **Short Description:** `line-clamp-2` is good.
    4.  **Consolidated Metadata:** Duration and enrolled count will be grouped together with icons, but styled to be less prominent than the title and description.
*   **Interaction Notes:**
    *   The entire card will be clickable, navigating to the `CourseDetails` page.
    *   The multiple buttons in the footer will be removed and replaced with a single, clear call-to-action on the `CourseDetails` page.
    *   For admins, the delete button will remain, but perhaps be less prominent (e.g., an icon button in the corner).

### 2.2. Screen: Course Details Page (`/courses/{id}`)

**Purpose:** To serve as the central hub for a specific course. It should excite the user to start, clearly present the learning path, and make it easy to track progress.

**Layout Redesign: Two-Column Layout**

The page will be changed from a single-column feed to a more organized two-column layout on desktop screens.

*   **Left Column (70% width): The Learning Path**
    *   **Header:** A "hero" style header with the `course_name` (larger font), `course_description`, and the primary call-to-action button.
        *   **CTA Button:** This is critical. It will dynamically change:
            *   If not enrolled: "Enroll in Course"
            *   If enrolled, not started: "Start Learning"
            *   If in progress: "Continue to Next Module"
            *   If completed: "Review Course"
    *   **Modules & Assessments List:** A sequential list of all `CourseModule` and `CourseAssessment` items.
        *   **Visual Status:** Each item in the list should have a clear visual indicator:
            *   `Completed`: Checkmark icon, slightly greyed out.
            *   `In Progress / Next Up`: Highlighted background or prominent icon.
            *   `Locked`: Lock icon, not clickable.
*   **Right Column (30% width): Status & Details**
    *   **"Progress" Card:**
        *   A large circular progress bar showing overall course completion percentage.
        *   Text below showing "X / Y Modules Completed".
    *   **"Details" Card:**
        *   Contains metadata like:
            *   Difficulty Level
            *   Estimated Duration
            *   Course Type (Onboarding, Technical, etc.)
            *   Mandatory/Optional status.

## 3. Next Steps

1.  **Review:** Share this specification with the development team for feedback.
2.  **Implement:** The `dev` agent can now begin implementing the changes based on these specifications.
3.  **Test:** Once implemented, conduct usability testing to validate the new design.
