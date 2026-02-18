import { Router } from 'express';
import { validate } from '../../middleware/validate.js';
import * as schedulesValidators from './schedules.validators.js';
import * as schedulesControllers from './schedules.controllers.js';

const router = Router();

// Schedule CRUD operations
router.post(
    '/',
    validate(schedulesValidators.createScheduleSchema),
    schedulesControllers.saveNewSchedule
);

router.get(
    '/',
    validate(schedulesValidators.getSchedulesQuerySchema, 'query'),
    schedulesControllers.getSchedules
);

router.get(
    '/:id',
    validate(schedulesValidators.scheduleIdParamSchema, 'params'),
    schedulesControllers.getScheduleById
);

router.put(
    '/:id',
    validate(schedulesValidators.scheduleIdParamSchema, 'params'),
    validate(schedulesValidators.updateScheduleSchema),
    schedulesControllers.updateSchedule
);

router.delete(
    '/:id',
    validate(schedulesValidators.scheduleIdParamSchema, 'params'),
    schedulesControllers.deleteSchedule
);

// Day operations
router.get(
    '/:id/days',
    validate(schedulesValidators.scheduleIdParamSchema, 'params'),
    schedulesControllers.getDays
);

router.post(
    '/:id/days',
    validate(schedulesValidators.scheduleIdParamSchema, 'params'),
    validate(schedulesValidators.createDaySchema),
    schedulesControllers.createDay
);

router.get(
    '/:id/days/:dayId',
    validate(schedulesValidators.scheduleAndDayIdParamSchema, 'params'),
    schedulesControllers.getDayById
);

router.put(
    '/:id/days/:dayId',
    validate(schedulesValidators.scheduleAndDayIdParamSchema, 'params'),
    validate(schedulesValidators.updateDaySchema),
    schedulesControllers.updateDay
);

router.delete(
    '/:id/days/:dayId',
    validate(schedulesValidators.scheduleAndDayIdParamSchema, 'params'),
    schedulesControllers.deleteDay
);

// Event Dependencies routes
router.post(
    '/:id/dependencies',
    schedulesValidators.validateSaveDependencies,
    schedulesControllers.saveEventDependencies
);

router.put(
    '/:id/dependencies/:depsId',
    schedulesValidators.validateUpdateDependencies,
    schedulesControllers.updateEventDependencies
);

router.get(
    '/:id/dependencies',
    schedulesValidators.validateGetDependencies,
    schedulesControllers.getEventDependencies
);

// Block operations (updated to use day-based routing)
router.get(
    '/:id/days/:dayId/blocks',
    validate(schedulesValidators.scheduleAndDayIdParamSchema, 'params'),
    schedulesControllers.getBlocksByDay
);

router.post(
    '/:id/days/:dayId/blocks',
    validate(schedulesValidators.scheduleAndDayIdParamSchema, 'params'),
    (req, res, next) => {
        // Check if it's multiple blocks or single block
        if (req.body.blocks) {
            return validate(schedulesValidators.createMultipleBlocksSchema)(req, res, next);
        } else {
            return validate(schedulesValidators.createBlockSchema)(req, res, next);
        }
    },
    schedulesControllers.addBlocksToDay
);

router.get(
    '/:id/days/:dayId/blocks/:blockId',
    validate(schedulesValidators.scheduleAndDayAndBlockIdParamSchema, 'params'),
    schedulesControllers.getBlockById
);

router.put(
    '/:id/days/:dayId/blocks/:blockId',
    validate(schedulesValidators.scheduleAndDayAndBlockIdParamSchema, 'params'),
    validate(schedulesValidators.updateBlockSchema),
    schedulesControllers.updateBlock
);

router.delete(
    '/:id/days/:dayId/blocks/:blockId',
    validate(schedulesValidators.scheduleAndDayAndBlockIdParamSchema, 'params'),
    schedulesControllers.deleteBlock
);

router.patch(
    '/:id/days/:dayId/blocks/:blockId/complete',
    validate(schedulesValidators.scheduleAndDayAndBlockIdParamSchema, 'params'),
    schedulesControllers.markBlockCompleted
);

// Legacy block operations (for backward compatibility during migration)
// router.post('/:id/blocks',
//     validate(schedulesValidators.scheduleIdParamSchema, 'params'),
//     (req, res, next) => {
//         // Check if it's multiple blocks or single block
//         if (req.body.blocks) {
//             return validate(schedulesValidators.createMultipleBlocksSchema)(req, res, next);
//         } else {
//             return validate(schedulesValidators.createBlockSchema)(req, res, next);
//         }
//     },
//     schedulesControllers.addBlocks
// );

// router.put('/:id/blocks/:blockId',
//     validate(schedulesValidators.scheduleAndBlockIdParamSchema, 'params'),
//     validate(schedulesValidators.updateBlockSchema),
//     schedulesControllers.updateBlock
// );

// router.delete('/:id/blocks/:blockId',
//     validate(schedulesValidators.scheduleAndBlockIdParamSchema, 'params'),
//     schedulesControllers.deleteBlock
// );

// // Bulk operations
// router.post('/:id/apply-ops',
//     validate(schedulesValidators.scheduleIdParamSchema, 'params'),
//     validate(schedulesValidators.diffOpsSchema),
//     schedulesControllers.applyOps
// );

// // Helper endpoints
// router.get('/:id/blocks/date-range',
//     validate(schedulesValidators.scheduleIdParamSchema, 'params'),
//     validate(schedulesValidators.dateRangeQuerySchema, 'query'),
//     schedulesControllers.getBlocksInDateRange
// );

// router.patch('/:id/blocks/:blockId/complete',
//     validate(schedulesValidators.scheduleAndBlockIdParamSchema, 'params'),
//     schedulesControllers.markBlockCompleted
// );

export default router;
