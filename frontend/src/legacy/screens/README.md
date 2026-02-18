# Legacy Screens

This directory contains the previous versions of screens that have been redesigned or replaced.

## Contents

- **OnboardingScreen.jsx** - Original onboarding screen implementation
    - Contains the full multi-step onboarding flow with name input, avatar selection, strategy preferences, and timing settings
    - Moved here to preserve the original implementation while developing the new Figma-based onboarding experience

## Purpose

These legacy screens are preserved for:

1. **Reference** - Understanding the original implementation and user flow
2. **Rollback** - Quick restoration if needed during development
3. **Migration** - Extracting useful components or logic for the new implementations
4. **Testing** - Comparing new vs old implementations

## Usage

To temporarily use a legacy screen, you can import it from this directory:

```jsx
import LegacyOnboardingScreen from '../legacy-screens/OnboardingScreen';
```

## Note

These screens should not be used in production and are maintained only for development reference.
