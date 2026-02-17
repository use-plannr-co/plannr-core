import { z } from 'zod';

/**
 * Preferences Validation Schemas
 */

export const updatePreferencesSchema = z.object({
    theme: z.enum(['light', 'dark']).optional(),
    defaultStrategy: z.enum(['earliest-fit', 'balanced-work', 'deadline-oriented']).optional(),
    defaultMinGap: z
        .string()
        .transform((val) => parseInt(val))
        .refine((val) => !isNaN(val) && val >= 0, 'Must be a valid number')
        .optional(),
    defaultMaxWorkingHours: z
        .string()
        .transform((val) => parseInt(val))
        .refine((val) => !isNaN(val) && val >= 1 && val <= 24, 'Must be between 1 and 24 hours')
        .optional(),
    taskRemindersEnabled: z.boolean().optional(),
    leadMinutes: z
        .string()
        .transform((val) => parseInt(val))
        .refine((val) => !isNaN(val) && val >= 0, 'Must be a valid number')
        .optional(),
    nickname: z.string().optional(),
    weekendPolicy: z.enum(['allow', 'restrict', 'disable']).optional(),
});

// Mapping function to convert frontend preferences to backend format
export const mapFrontendToBackend = (frontendPrefs) => {
    return {
        uiMode: frontendPrefs.theme || 'light',
        notificationsEnabled: frontendPrefs.taskRemindersEnabled ?? true,
        leadMinutes: frontendPrefs.leadMinutes ? parseInt(frontendPrefs.leadMinutes) : 30,
        minGapMinutes: frontendPrefs.defaultMinGap ? parseInt(frontendPrefs.defaultMinGap) : 15,
        maxWorkHoursPerDay: frontendPrefs.defaultMaxWorkingHours
            ? parseInt(frontendPrefs.defaultMaxWorkingHours)
            : 8,
        weekendPolicy: frontendPrefs.weekendPolicy || 'allow',
        defaultStrategy: frontendPrefs.defaultStrategy || 'earliest-fit',
        nickname: frontendPrefs.nickname || null,
    };
};

// Mapping function to convert backend preferences to frontend format
export const mapBackendToFrontend = (backendPrefs) => {
    return {
        theme: backendPrefs.uiMode || 'light',
        defaultStrategy: backendPrefs.defaultStrategy || 'earliest-fit',
        defaultMinGap: backendPrefs.minGapMinutes?.toString() || '15',
        defaultMaxWorkingHours: backendPrefs.maxWorkHoursPerDay?.toString() || '8',
        taskRemindersEnabled: backendPrefs.notificationsEnabled ?? true,
        leadMinutes: backendPrefs.leadMinutes?.toString() || '30',
        nickname: backendPrefs.nickname || '',
    };
};

// Validate request body middleware
export const validateUpdatePreferences = (req, res, next) => {
    try {
        req.validatedData = updatePreferencesSchema.parse(req.body);
        next();
    } catch (error) {
        return res.status(400).json({
            success: false,
            message: 'Validation failed',
            errors: error.errors,
        });
    }
};
