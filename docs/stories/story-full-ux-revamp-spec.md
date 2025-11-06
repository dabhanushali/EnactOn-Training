# Front-End Specification: Full UX Revamp

## 1. Introduction

This document provides a comprehensive specification for a full user experience (UX) revamp across three key areas of the EnactOn Training application: Navigation Consistency, Authentication, and the Course Engagement flow. The goal is to create a more cohesive, intuitive, and visually polished user journey.

### 1.1. Change Log

| Date       | Version | Description                                       | Author |
| :--------- | :------ | :------------------------------------------------ | :----- |
| 2025-09-19 | 1.0     | Initial consolidated draft for full UX revamp.    | Sally  |

---

## 2. Global Changes: Navigation Bar Consistency

### 2.1. Goal

Ensure a consistent and predictable user experience by including the main navigation bar (`<MainNav />`) on all relevant pages of the application.

### 2.2. Analysis

An audit of the page components in `src/pages/` has revealed that the `<MainNav />` component is missing from several key pages, leading to an inconsistent user journey.

**Affected Pages:**

*   `src/pages/Employees.tsx`
*   `src/pages/EmployeeDetail.tsx`

### 2.3. Action Required

Import and add the `<MainNav />` component to the top-level layout of the affected pages listed above. The component should be placed within the main `div` and before the `main` content block, consistent with its usage in other pages like `Dashboard.tsx` and `Courses.tsx`.

**Example Implementation (`Employees.tsx`):**

```tsx
import { MainNav } from '@/components/navigation/MainNav';
// ... other imports

export default function Employees() {
  // ... logic

  return (
    <div className="min-h-screen bg-background">
      <MainNav /> // <<< ADD THIS COMPONENT
      <div className="container mx-auto py-6 px-4">
        {/* ... rest of the page content ... */}
      </div>
    </div>
  );
}
```

---

## 3. Authentication UX Redesign (`/auth`)

### 3.1. Goal

Redesign the authentication experience to create a single, unified, and professionally branded screen for both login and signup, eliminating the current style inconsistencies.

### 3.2. Analysis

The current `LoginForm.tsx` has a strong, branded design with a background gradient and logo, which serves as a good foundation. However, the `SignupForm.tsx` is plain and unstyled. The parent `Auth.tsx` uses a simple tab switcher that feels disconnected.

### 3.3. Action Required

**1. Unify Layout in `Auth.tsx`:**

*   `Auth.tsx` will become the single source of truth for the auth screen's visual layout.
*   It should contain the full-screen layout with the gradient background and a single, centered `Card` component.
*   The branded header (logo and "GrowPro LMS" title) from the current `LoginForm` should be moved into `Auth.tsx`, appearing above the unified `Card`.

**2. Implement a Single, State-Driven Card:**

*   Remove the `Tabs` component from `Auth.tsx`.
*   Use a single `Card` that dynamically changes its content based on a local state (e.g., `const [isLogin, setIsLogin] = useState(true)`).
*   The `CardHeader` will display "Sign In" or "Create an Account" based on this state.
*   The `CardContent` will render either the `<LoginForm />` or `<SignupForm />` component.
*   The `CardFooter` will contain a text link to switch the mode. (e.g., "Don't have an account? <button onClick={() => setIsLogin(false)}>Sign Up</button>").

**3. Refactor Form Components (`LoginForm.tsx`, `SignupForm.tsx`):**

*   Strip these components of all layout-related elements (`Card`, `CardHeader`, background styles, etc.).
*   They should become "headless" components that only render the necessary `Label`, `Input`, and `Button` elements for the form itself, along with their submission logic.

**4. Add Visual Polish:**

*   To enhance the visual appeal, use the existing `hero-lms.jpg` from `src/assets` as a background image for the main container in `Auth.tsx`. Apply a semi-transparent gradient overlay (similar to the current `LoginForm`) to ensure the form remains readable.

---

## 4. Course Pages UX Redesign (`/courses`)

### 4.1. Goal

Redesign the course listing and details pages to be more focused, intuitive, and visually appealing, guiding the user effectively toward their learning goals.

### 4.2. Screen: Courses List Page (`/courses`)

**Component Spec: `CourseCard.tsx`**

*   **Visual Redesign:** Simplify the card to focus on discoverability. Increase white space and reduce information density.
*   **Information Hierarchy:**
    1.  **Course Title:** Most prominent element.
    2.  **Primary Status Badge:** Add a new badge for "Enrolled", "Completed", or "Not Enrolled".
    3.  **Short Description:** Keep `line-clamp-2`.
    4.  **Consolidated Metadata:** Group secondary info (duration, difficulty) to be less prominent.
*   **Interaction:** The entire card should be a single clickable element leading to the details page. Remove the multiple footer buttons.

### 4.3. Screen: Course Details Page (`/courses/{id}`)

**Layout Redesign: Two-Column Layout**

*   **Left Column (Main Content): The Learning Path**
    *   **Hero Header:** Prominent `course_name`, `course_description`, and a single, dynamic primary call-to-action button ("Enroll", "Start Learning", "Continue").
    *   **Modules & Assessments List:** A sequential list of all course items. Each item must have a visual status indicator (e.g., `Completed` checkmark, `In Progress` highlight, `Locked` icon).
*   **Right Column (Status & Info):**
    *   **"Progress" Card:** Display a large circular progress bar for overall course completion.
    *   **"Details" Card:** Contain secondary metadata (Difficulty, Duration, Type, etc.).
