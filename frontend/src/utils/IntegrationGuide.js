/**
 * Integration Helper Functions
 *
 * Helper functions for integrating action logging and crash reporting
 */

export const IntegrationHelpers = {
    // Setup function for App.js
    setupApp: `
// Add these imports to App.js:
import { setupCrashReporting, ErrorBoundary } from './src/utils/CrashReporter';
import { ActionLogger, ActionTypes } from './src/utils/ActionLogger';
import { AppState } from 'react-native';

// In your App component:
useEffect(() => {
  setupCrashReporting();
  
  const handleAppStateChange = (nextAppState) => {
    if (nextAppState === 'active') {
      ActionLogger.logAction(ActionTypes.APP_FOREGROUND);
    } else if (nextAppState === 'background') {
      ActionLogger.logAction(ActionTypes.APP_BACKGROUND);
    }
  };

  const appStateSubscription = AppState.addEventListener('change', handleAppStateChange);
  return () => appStateSubscription?.remove();
}, []);

// Wrap your app with ErrorBoundary
`,

    // Component integration example
    componentUsage: `
// In your React components:
import { useActionLogger } from '../hooks/useActionLogger';

const YourScreen = () => {
  const { logUserAction, logSettingChange, logError } = useActionLogger('YourScreen');
  
  const handleButtonPress = () => {
    logUserAction('button_press', { button: 'save' });
  };
  
  return <View>...</View>;
};
`,

    // Privacy info
    privacyInfo: {
        whatIsLogged: [
            'Button presses and screen navigation',
            'API calls and responses (not content)',
            'Device info and app version',
            'Error messages and stack traces',
            'Anonymous usage patterns',
        ],
        whatIsNotLogged: [
            'Personal data or schedule content',
            'Passwords or authentication tokens',
            'User names or contact information',
            'Location data',
            'Any sensitive user content',
        ],
    },
};

export default IntegrationHelpers;
