import { z } from 'zod';

/**
 * User Validation Schemas
 */

export const createUserSchema = z.object({
    clerkUserId: z.string().min(1, 'Clerk User ID is required'),
    email: z.string().email('Valid email is required'),
    displayName: z.string().optional(),
    avatarName: z
        .enum(['bear', 'bunny', 'cat', 'croc', 'fox', 'hen', 'lion', 'puppy', 'squirrel'], {
            errorMap: () => ({ message: 'Invalid avatar name' }),
        })
        .optional(),
});

export const updateUserProfileSchema = z.object({
    displayName: z
        .string()
        .min(1, 'Display name is required')
        .max(100, 'Display name must be less than 100 characters')
        .optional(),
    avatarName: z
        .enum(['bear', 'bunny', 'cat', 'croc', 'fox', 'hen', 'lion', 'puppy', 'squirrel'], {
            errorMap: () => ({ message: 'Invalid avatar name' }),
        })
        .optional(),
});

export const updateAvatarSchema = z.object({
    avatarName: z.enum(
        ['bear', 'bunny', 'cat', 'croc', 'fox', 'hen', 'lion', 'puppy', 'squirrel'],
        {
            errorMap: () => ({ message: 'Invalid avatar name' }),
        }
    ),
});

export const updateUserEmailSchema = z.object({
    email: z.string().email('Valid email address is required').min(1, 'Email is required'),
});

export const updateIntegrationsSchema = z
    .object({
        googleCalendar: z.boolean().optional(),
        todoist: z.boolean().optional(),
        notion: z.boolean().optional(),
        googleTasks: z.boolean().optional(),
        microsoftTodo: z.boolean().optional(),
    })
    .refine((data) => Object.keys(data).length > 0, {
        message: 'At least one integration field must be provided',
    });

export const clerkWebhookSchema = z
    .object({
        type: z.string(),
        data: z
            .object({
                id: z.string(),
                email_addresses: z
                    .array(
                        z.object({
                            email_address: z.string().email(),
                            id: z.string(),
                        })
                    )
                    .optional(),
                primary_email_address_id: z.string().optional(),
                first_name: z.string().nullable().optional(),
                last_name: z.string().nullable().optional(),
                image_url: z.string().nullable().optional(),
                profile_image_url: z.string().nullable().optional(),
                created_at: z.number().optional(),
                updated_at: z.number().optional(),
            })
            .passthrough(), // Allow additional fields that Clerk might send
    })
    .passthrough(); // Allow additional top-level fields

export const userIdParamSchema = z.object({
    userId: z.string().uuid('Valid user ID is required'),
});

// Validate request body middleware
export const validateCreateUser = (req, res, next) => {
    try {
        req.validatedData = createUserSchema.parse(req.body);
        next();
    } catch (error) {
        return res.status(400).json({
            success: false,
            message: 'Validation failed',
            errors: error.errors,
        });
    }
};

export const validateUpdateUserProfile = (req, res, next) => {
    try {
        req.validatedData = updateUserProfileSchema.parse(req.body);
        next();
    } catch (error) {
        return res.status(400).json({
            success: false,
            message: 'Validation failed',
            errors: error.errors,
        });
    }
};

export const validateUpdateAvatar = (req, res, next) => {
    try {
        req.validatedData = updateAvatarSchema.parse(req.body);
        next();
    } catch (error) {
        return res.status(400).json({
            success: false,
            message: 'Validation failed',
            errors: error.errors,
        });
    }
};

export const validateUpdateUserEmail = (req, res, next) => {
    try {
        req.validatedData = updateUserEmailSchema.parse(req.body);
        next();
    } catch (error) {
        return res.status(400).json({
            success: false,
            message: 'Validation failed',
            errors: error.errors,
        });
    }
};

export const validateUpdateIntegrations = (req, res, next) => {
    try {
        req.validatedData = updateIntegrationsSchema.parse(req.body);
        next();
    } catch (error) {
        return res.status(400).json({
            success: false,
            message: 'Validation failed',
            errors: error.errors,
        });
    }
};

export const validateClerkWebhook = (req, res, next) => {
    try {
        req.validatedData = clerkWebhookSchema.parse(req.body);
        next();
    } catch (error) {
        return res.status(400).json({
            success: false,
            message: 'Invalid webhook payload',
            errors: error.errors,
        });
    }
};
