import { db } from '../../config/db.js';
import { schedules, blocks, users, days, dependencies } from '../../db/schema.js';
import { eq, and, gte, lte, isNull, desc, asc, sql } from 'drizzle-orm';

/**
 * Schedules Repository
 * Handles database operations for schedules and blocks with Time24 format
 */

// Helper functions for ScheduleDate and Time24 conversion
const parseTime24 = (timeValue) => {
    if (typeof timeValue === 'number') return timeValue;
    if (typeof timeValue === 'string') return parseInt(timeValue, 10);
    return timeValue;
};

const convertScheduleDateToISO = (scheduleDate) => {
    if (!scheduleDate) return null;

    // If it's already an ISO string, return as is
    if (typeof scheduleDate === 'string') return scheduleDate;

    // If it's a ScheduleDate object {date: 7, month: 10, year: 2025}
    if (scheduleDate.date && scheduleDate.month && scheduleDate.year) {
        const isoString = `${scheduleDate.year}-${scheduleDate.month.toString().padStart(2, '0')}-${scheduleDate.date.toString().padStart(2, '0')}`;
        return isoString;
    }

    return null;
};

const formatDateForDb = (dateValue) => {
    if (!dateValue) return null;

    // Convert ScheduleDate object or ISO string to Date object for database
    const isoString = convertScheduleDateToISO(dateValue);
    return isoString;
};

const convertDateToScheduleDate = (date) => {
    if (!date) return null;

    const dateObj = new Date(date);
    return {
        date: dateObj.getDate(),
        month: dateObj.getMonth() + 1, // getMonth() is 0-indexed
        year: dateObj.getFullYear(),
    };
};

// Schedule operations
export const createSchedule = async (scheduleData) => {
    const insertData = {
        title: scheduleData.title,
        ownerId: scheduleData.ownerId,
        isActive: scheduleData.isActive || false,
        numDays: scheduleData.numDays || 7,
        minGap: scheduleData.minGap || 15,
        workingHoursLimit: scheduleData.workingHoursLimit || 8,
        strategy: scheduleData.strategy || 'earliest-fit',
        startTime: parseTime24(scheduleData.startTime) || 900,
        endTime: parseTime24(scheduleData.endTime) || 1700,
        metadata: scheduleData.metadata || {},
    };

    // Handle period-based scheduling
    if (scheduleData.periodStart && scheduleData.periodEnd) {
        insertData.periodStart = formatDateForDb(scheduleData.periodStart);
        insertData.periodEnd = formatDateForDb(
            scheduleData.periodStart.getDateAfter(scheduleData.numDays - 1)
        );
    }

    // Handle day1-based scheduling (your frontend Schedule model)
    if (scheduleData.day1Date) {
        insertData.day1Date = scheduleData.day1Date; // Store as ScheduleDate object
        insertData.day1Day = scheduleData.day1Day;

        // Also set period dates for compatibility
        if (!insertData.periodStart) {
            insertData.periodStart = formatDateForDb(scheduleData.day1Date);
            // Calculate period end based on numDays
            const startDate = formatDateForDb(scheduleData.day1Date);
            const endDate = new Date(startDate);
            endDate.setDate(endDate.getDate() + (scheduleData.numDays || 7) - 1);
            insertData.periodEnd = endDate;
        }
    }

    const [newSchedule] = await db.insert(schedules).values(insertData).returning();
    return newSchedule;
};

export const getScheduleById = async (scheduleId, includeBlocks = false) => {
    try {
        const [schedule] = await db
            .select()
            .from(schedules)
            .where(and(eq(schedules.id, scheduleId), isNull(schedules.deletedAt)))
            .limit(1);

        if (!schedule) return null;

        if (includeBlocks) {
            const scheduleBlocks = await getBlocksByScheduleId(scheduleId);
            return {
                ...schedule,
                blocks: scheduleBlocks,
            };
        }

        return schedule;
    } catch (error) {
        throw new Error(`Failed to get schedule: ${error.message}`);
    }
};

export const getSchedulesByUserId = async (userId, options = {}) => {
    const { since, limit = 20, cursor, isActive, includeBlocks = true } = options;

    try {
        let query = db
            .select()
            .from(schedules)
            .where(and(eq(schedules.ownerId, userId), isNull(schedules.deletedAt)));

        // Add filters
        if (isActive !== undefined) {
            query = query.where(eq(schedules.isActive, isActive));
        }

        if (since) {
            query = query.where(gte(schedules.updatedAt, new Date(since)));
        }

        if (cursor) {
            query = query.where(gte(schedules.updatedAt, new Date(cursor)));
        }

        // Add ordering and limit
        query = query.orderBy(desc(schedules.updatedAt)).limit(limit);

        const results = await query;

        if (includeBlocks) {
            const schedulesWithBlocks = await Promise.all(
                results.map(async (schedule) => {
                    const scheduleBlocks = await getBlocksByScheduleId(schedule.id);
                    return {
                        ...schedule,
                        schedule: scheduleBlocks,
                    };
                })
            );
            return schedulesWithBlocks;
        }

        return results;
    } catch (error) {
        throw new Error(`Failed to get schedules: ${error.message}`);
    }
};

export const updateSchedule = async (scheduleId, updateData) => {
    try {
        const updateFields = { updatedAt: new Date() };

        // Handle each field with proper conversion
        if (updateData.title !== undefined) updateFields.title = updateData.title;
        if (updateData.periodStart !== undefined)
            updateFields.periodStart = formatDateForDb(updateData.periodStart);
        if (updateData.periodEnd !== undefined)
            updateFields.periodEnd = formatDateForDb(updateData.periodEnd);
        if (updateData.isActive !== undefined) updateFields.isActive = updateData.isActive;
        if (updateData.numDays !== undefined) updateFields.numDays = updateData.numDays;
        if (updateData.minGap !== undefined) updateFields.minGap = updateData.minGap;
        if (updateData.workingHoursLimit !== undefined)
            updateFields.workingHoursLimit = updateData.workingHoursLimit;
        if (updateData.strategy !== undefined) updateFields.strategy = updateData.strategy;
        if (updateData.startTime !== undefined)
            updateFields.startTime = parseTime24(updateData.startTime);
        if (updateData.endTime !== undefined)
            updateFields.endTime = parseTime24(updateData.endTime);
        if (updateData.metadata !== undefined) updateFields.metadata = updateData.metadata;

        const [updatedSchedule] = await db
            .update(schedules)
            .set(updateFields)
            .where(and(eq(schedules.id, scheduleId), isNull(schedules.deletedAt)))
            .returning();

        return updatedSchedule;
    } catch (error) {
        throw new Error(`Failed to update schedule: ${error.message}`);
    }
};

export const deleteSchedule = async (scheduleId) => {
    try {
        // First manually delete all blocks (hard delete to remove them completely)
        await db.delete(blocks).where(eq(blocks.scheduleId, scheduleId));

        // Then hard delete the schedule
        const [deletedSchedule] = await db
            .delete(schedules)
            .where(eq(schedules.id, scheduleId))
            .returning();

        return deletedSchedule;
    } catch (error) {
        throw new Error(`Failed to delete schedule: ${error.message}`);
    }
};

// Block operations (LEGACY - for backward compatibility with auto-migration)
export const createBlock = async (blockData) => {
    const {
        scheduleId, // Legacy field - needs to be converted to dayId
        dayId, // New field - preferred
        type,
        title,
        startAt,
        endAt,
        blockDate,
        date, // Alternative field name
        category,
        metadata = {},
        priority,
        deadline,
        duration,
        frontendId,
        completed = false,
    } = blockData;

    try {
        // If dayId is provided, use the new structure
        if (dayId) {
            return createBlockForDay(blockData);
        }

        // Legacy support: if scheduleId is provided but no dayId
        if (scheduleId && !dayId) {
            // Auto-create or find day for this block
            const dateValue = blockDate || date || new Date().toISOString().split('T')[0];
            const dayForBlock = await findOrCreateDayForDate(scheduleId, dateValue);

            // Create block with the found/created dayId
            const blockDataWithDay = {
                ...blockData,
                dayId: dayForBlock.id,
            };
            delete blockDataWithDay.scheduleId; // Remove legacy field

            return createBlockForDay(blockDataWithDay);
        }

        throw new Error('Either dayId or scheduleId must be provided');
    } catch (error) {
        throw new Error(`Failed to create block: ${error.message}`);
    }
};

// Helper function to find or create a day for a given date
export const findOrCreateDayForDate = async (scheduleId, dateString) => {
    try {
        // First, try to find existing day for this date
        const [existingDay] = await db
            .select()
            .from(days)
            .where(and(eq(days.scheduleId, scheduleId), eq(days.date, dateString)))
            .limit(1);

        if (existingDay) {
            return existingDay;
        }

        // If no day exists, create one
        const date = new Date(dateString + 'T00:00:00.000Z');
        const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });

        // Get schedule to determine day number
        const schedule = await getScheduleById(scheduleId);
        const existingDays = await getDaysByScheduleId(scheduleId);
        const dayNumber = existingDays.length + 1;

        // Create ScheduleDate object
        const dateObject = {
            date: date.getDate(),
            month: date.getMonth() + 1,
            year: date.getFullYear(),
        };

        const newDayData = {
            scheduleId,
            dayNumber,
            dayName,
            date: dateString,
            dateObject,
            isWeekend: date.getDay() === 0 || date.getDay() === 6,
            minGap: schedule?.minGap || 15,
            metadata: {},
        };

        return createDay(newDayData);
    } catch (error) {
        throw new Error(`Failed to find or create day: ${error.message}`);
    }
};

export const createMultipleBlocks = async (blocksData) => {
    try {
        // Check if blocks have dayId or need legacy handling
        if (blocksData.length > 0 && blocksData[0].dayId) {
            return createMultipleBlocksForDay(blocksData);
        } else if (blocksData.length > 0 && blocksData[0].scheduleId) {
            // Legacy support with auto-migration
            const processedBlocks = [];

            for (const blockData of blocksData) {
                const dateValue =
                    blockData.blockDate || blockData.date || new Date().toISOString().split('T')[0];
                const dayForBlock = await findOrCreateDayForDate(blockData.scheduleId, dateValue);

                const processedBlock = {
                    ...blockData,
                    dayId: dayForBlock.id,
                };
                delete processedBlock.scheduleId; // Remove legacy field

                processedBlocks.push(processedBlock);
            }

            return createMultipleBlocksForDay(processedBlocks);
        } else {
            throw new Error('Blocks data must include either dayId or scheduleId');
        }
    } catch (error) {
        throw new Error(`Failed to create multiple blocks: ${error.message}`);
    }
};

export const getBlocksByScheduleId = async (scheduleId) => {
    try {
        // Now blocks are associated with schedule through days relationship
        return getAllBlocksForSchedule(scheduleId);
    } catch (error) {
        throw new Error(`Failed to get blocks: ${error.message}`);
    }
};

export const getBlockById = async (blockId) => {
    try {
        const [block] = await db
            .select()
            .from(blocks)
            .where(and(eq(blocks.id, blockId), isNull(blocks.deletedAt)))
            .limit(1);

        return block || null;
    } catch (error) {
        throw new Error(`Failed to get block: ${error.message}`);
    }
};

export const updateBlock = async (blockId, updateData) => {
    try {
        const updateFields = { updatedAt: new Date() };

        // Handle each field with proper conversion
        if (updateData.type !== undefined) updateFields.type = updateData.type;
        if (updateData.title !== undefined) updateFields.title = updateData.title;
        if (updateData.startAt !== undefined)
            updateFields.startAt = parseTime24(updateData.startAt);
        if (updateData.endAt !== undefined) updateFields.endAt = parseTime24(updateData.endAt);
        if (updateData.blockDate !== undefined)
            updateFields.blockDate = formatDateForDb(updateData.blockDate);
        if (updateData.category !== undefined) updateFields.category = updateData.category;
        if (updateData.metadata !== undefined) updateFields.metadata = updateData.metadata;
        if (updateData.priority !== undefined) updateFields.priority = updateData.priority;
        if (updateData.deadline !== undefined)
            updateFields.deadline = updateData.deadline
                ? formatDateForDb(updateData.deadline)
                : null;
        if (updateData.duration !== undefined) updateFields.duration = updateData.duration;
        if (updateData.frontendId !== undefined) updateFields.frontendId = updateData.frontendId;
        if (updateData.completed !== undefined) updateFields.completed = updateData.completed;

        const [updatedBlock] = await db
            .update(blocks)
            .set(updateFields)
            .where(and(eq(blocks.id, blockId), isNull(blocks.deletedAt)))
            .returning();

        return updatedBlock;
    } catch (error) {
        throw new Error(`Failed to update block: ${error.message}`);
    }
};

export const deleteBlock = async (blockId) => {
    try {
        const [deletedBlock] = await db
            .update(blocks)
            .set({
                deletedAt: new Date(),
                updatedAt: new Date(),
            })
            .where(and(eq(blocks.id, blockId), isNull(blocks.deletedAt)))
            .returning();

        return deletedBlock;
    } catch (error) {
        throw new Error(`Failed to delete block: ${error.message}`);
    }
};

export const getScheduleWithOwner = async (scheduleId) => {
    try {
        const result = await db
            .select({
                schedule: schedules,
                owner: users,
            })
            .from(schedules)
            .innerJoin(users, eq(schedules.ownerId, users.id))
            .where(and(eq(schedules.id, scheduleId), isNull(schedules.deletedAt)))
            .limit(1);

        return result.length ? result[0] : null;
    } catch (error) {
        throw new Error(`Failed to get schedule with owner: ${error.message}`);
    }
};

export const getBlocksInDateRange = async (scheduleId, startDate, endDate) => {
    try {
        // Get blocks within date range through days relationship
        const scheduleBlocks = await db
            .select({
                id: blocks.id,
                dayId: blocks.dayId,
                type: blocks.type,
                title: blocks.title,
                startAt: blocks.startAt,
                endAt: blocks.endAt,
                blockDate: blocks.blockDate,
                dateObject: blocks.dateObject,
                category: blocks.category,
                metadata: blocks.metadata,
                priority: blocks.priority,
                deadline: blocks.deadline,
                deadlineObject: blocks.deadlineObject,
                duration: blocks.duration,
                frontendId: blocks.frontendId,
                completed: blocks.completed,
                version: blocks.version,
                deletedAt: blocks.deletedAt,
                createdAt: blocks.createdAt,
                updatedAt: blocks.updatedAt,
                // Include day information
                dayNumber: days.dayNumber,
                dayName: days.dayName,
                dayDate: days.date,
            })
            .from(blocks)
            .innerJoin(days, eq(blocks.dayId, days.id))
            .where(
                and(
                    eq(days.scheduleId, scheduleId),
                    isNull(blocks.deletedAt),
                    gte(days.date, startDate), // Use day date instead of block date
                    lte(days.date, endDate)
                )
            )
            .orderBy(asc(days.dayNumber), asc(blocks.startAt));

        return scheduleBlocks;
    } catch (error) {
        throw new Error(`Failed to get blocks in date range: ${error.message}`);
    }
};

export const markBlockAsCompleted = async (blockId, completed = true) => {
    try {
        const [updatedBlock] = await db
            .update(blocks)
            .set({
                completed,
                updatedAt: new Date(),
            })
            .where(and(eq(blocks.id, blockId), isNull(blocks.deletedAt)))
            .returning();

        return updatedBlock;
    } catch (error) {
        throw new Error(`Failed to mark block as completed: ${error.message}`);
    }
};

// =============================================================================
// DAY OPERATIONS
// =============================================================================

export const getDaysByScheduleId = async (scheduleId) => {
    try {
        const scheduleDays = await db
            .select()
            .from(days)
            .where(eq(days.scheduleId, scheduleId))
            .orderBy(asc(days.dayNumber));

        return scheduleDays;
    } catch (error) {
        throw new Error(`Failed to get days: ${error.message}`);
    }
};

export const createDay = async (dayData) => {
    const {
        scheduleId,
        dayNumber,
        dayName,
        date,
        dateObject,
        dayStartTime,
        dayEndTime,
        isWeekend = false,
        isHoliday = false,
        maxWorkingHours,
        minGap = 15,
        metadata = {},
    } = dayData;

    try {
        const insertData = {
            scheduleId,
            dayNumber,
            dayName,
            date, // Expecting YYYY-MM-DD format
            dateObject, // ScheduleDate object {date: 7, month: 10, year: 2025}
            isWeekend,
            isHoliday,
            minGap,
            metadata,
        };

        // Optional fields
        if (dayStartTime !== undefined) {
            insertData.dayStartTime = parseTime24(dayStartTime);
        }
        if (dayEndTime !== undefined) {
            insertData.dayEndTime = parseTime24(dayEndTime);
        }
        if (maxWorkingHours !== undefined) {
            insertData.maxWorkingHours = maxWorkingHours;
        }

        const [newDay] = await db.insert(days).values(insertData).returning();
        return newDay;
    } catch (error) {
        throw new Error(`Failed to create day: ${error.message}`);
    }
};

export const getDayById = async (dayId, includeBlocks = false) => {
    try {
        const [day] = await db.select().from(days).where(eq(days.id, dayId)).limit(1);

        if (!day) return null;

        if (includeBlocks) {
            const dayBlocks = await getBlocksByDayId(dayId);
            return {
                ...day,
                blocks: dayBlocks,
            };
        }

        return day;
    } catch (error) {
        throw new Error(`Failed to get day: ${error.message}`);
    }
};

export const updateDay = async (dayId, updateData) => {
    try {
        const updateFields = { updatedAt: new Date() };

        // Handle each field with proper conversion
        if (updateData.dayNumber !== undefined) updateFields.dayNumber = updateData.dayNumber;
        if (updateData.dayName !== undefined) updateFields.dayName = updateData.dayName;
        if (updateData.date !== undefined) updateFields.date = updateData.date;
        if (updateData.dateObject !== undefined) updateFields.dateObject = updateData.dateObject;
        if (updateData.dayStartTime !== undefined)
            updateFields.dayStartTime = parseTime24(updateData.dayStartTime);
        if (updateData.dayEndTime !== undefined)
            updateFields.dayEndTime = parseTime24(updateData.dayEndTime);
        if (updateData.isWeekend !== undefined) updateFields.isWeekend = updateData.isWeekend;
        if (updateData.isHoliday !== undefined) updateFields.isHoliday = updateData.isHoliday;
        if (updateData.maxWorkingHours !== undefined)
            updateFields.maxWorkingHours = updateData.maxWorkingHours;
        if (updateData.minGap !== undefined) updateFields.minGap = updateData.minGap;
        if (updateData.metadata !== undefined) updateFields.metadata = updateData.metadata;

        const [updatedDay] = await db
            .update(days)
            .set(updateFields)
            .where(eq(days.id, dayId))
            .returning();

        return updatedDay;
    } catch (error) {
        throw new Error(`Failed to update day: ${error.message}`);
    }
};

export const deleteDay = async (dayId) => {
    try {
        // Delete day (this will cascade delete all blocks due to foreign key constraint)
        const [deletedDay] = await db.delete(days).where(eq(days.id, dayId)).returning();

        return deletedDay;
    } catch (error) {
        throw new Error(`Failed to delete day: ${error.message}`);
    }
};

// =============================================================================
// DAY-BASED BLOCK OPERATIONS
// =============================================================================

export const getBlocksByDayId = async (dayId) => {
    try {
        const dayBlocks = await db
            .select()
            .from(blocks)
            .where(and(eq(blocks.dayId, dayId), isNull(blocks.deletedAt)))
            .orderBy(asc(blocks.startAt));

        return dayBlocks;
    } catch (error) {
        throw new Error(`Failed to get blocks by day: ${error.message}`);
    }
};

export const createBlockForDay = async (blockData) => {
    const {
        dayId,
        type,
        title,
        startAt,
        endAt,
        blockDate,
        dateObject,
        category,
        metadata = {},
        priority,
        deadline,
        deadlineObject,
        duration,
        frontendId,
        completed = false,
    } = blockData;

    try {
        const insertData = {
            dayId,
            type,
            title,
            startAt: parseTime24(startAt),
            endAt: parseTime24(endAt),
            category,
            metadata,
            priority,
            duration,
            frontendId,
            completed,
        };

        // Optional date fields (backward compatibility)
        if (blockDate) {
            insertData.blockDate = formatDateForDb(blockDate);
        }
        if (dateObject) {
            insertData.dateObject = dateObject;
        }

        // Handle deadline
        if (deadline) {
            insertData.deadline = formatDateForDb(deadline);
        }
        if (deadlineObject) {
            insertData.deadlineObject = deadlineObject;
        }

        const [newBlock] = await db.insert(blocks).values(insertData).returning();
        return newBlock;
    } catch (error) {
        throw new Error(`Failed to create block for day: ${error.message}`);
    }
};

export const createMultipleBlocksForDay = async (blocksData) => {
    try {
        // Process each block to ensure proper format
        const processedBlocks = blocksData.map((blockData) => ({
            dayId: blockData.dayId,
            type: blockData.type,
            title: blockData.title,
            startAt: parseTime24(blockData.startAt),
            endAt: parseTime24(blockData.endAt),
            blockDate: blockData.blockDate ? formatDateForDb(blockData.blockDate) : null,
            dateObject: blockData.dateObject || null,
            category: blockData.category,
            metadata: blockData.metadata || {},
            priority: blockData.priority,
            deadline: blockData.deadline ? formatDateForDb(blockData.deadline) : null,
            deadlineObject: blockData.deadlineObject || null,
            duration: blockData.duration,
            frontendId: blockData.frontendId,
            completed: blockData.completed || false,
        }));

        const newBlocks = await db.insert(blocks).values(processedBlocks).returning();
        return newBlocks;
    } catch (error) {
        throw new Error(`Failed to create multiple blocks for day: ${error.message}`);
    }
};

// =============================================================================
// UPDATED BLOCK OPERATIONS FOR DAY SUPPORT
// =============================================================================

// Update existing createBlock to support both dayId and legacy scheduleId
export const createBlockWithDaySupport = async (blockData) => {
    if (blockData.dayId) {
        return createBlockForDay(blockData);
    } else {
        return createBlock(blockData); // Use existing legacy function
    }
};

// Update existing createMultipleBlocks to support both dayId and legacy scheduleId
export const createMultipleBlocksWithDaySupport = async (blocksData) => {
    if (blocksData.length > 0 && blocksData[0].dayId) {
        return createMultipleBlocksForDay(blocksData);
    } else {
        return createMultipleBlocks(blocksData); // Use existing legacy function
    }
};

// =============================================================================
// MIGRATION SUPPORT FUNCTIONS
// =============================================================================

// Helper function to get all blocks for a schedule (through days relationship)
export const getAllBlocksForSchedule = async (scheduleId) => {
    try {
        // Get all blocks through the days relationship
        const scheduleBlocks = await db
            .select({
                id: blocks.id,
                dayId: blocks.dayId,
                type: blocks.type,
                title: blocks.title,
                startAt: blocks.startAt,
                endAt: blocks.endAt,
                blockDate: blocks.blockDate,
                dateObject: blocks.dateObject,
                category: blocks.category,
                metadata: blocks.metadata,
                priority: blocks.priority,
                deadline: blocks.deadline,
                deadlineObject: blocks.deadlineObject,
                duration: blocks.duration,
                frontendId: blocks.frontendId,
                completed: blocks.completed,
                version: blocks.version,
                deletedAt: blocks.deletedAt,
                createdAt: blocks.createdAt,
                updatedAt: blocks.updatedAt,
                // Include day information
                dayNumber: days.dayNumber,
                dayName: days.dayName,
                dayDate: days.date,
            })
            .from(blocks)
            .innerJoin(days, eq(blocks.dayId, days.id))
            .where(and(eq(days.scheduleId, scheduleId), isNull(blocks.deletedAt)))
            .orderBy(asc(days.dayNumber), asc(blocks.startAt));

        return scheduleBlocks;
    } catch (error) {
        throw new Error(`Failed to get all blocks for schedule: ${error.message}`);
    }
};

// Helper function to check schedule structure and day setup
export const getScheduleStructureInfo = async (scheduleId) => {
    try {
        const schedule = await getScheduleById(scheduleId);
        const scheduleDays = await getDaysByScheduleId(scheduleId);
        const scheduleBlocks = await getAllBlocksForSchedule(scheduleId);

        return {
            schedule,
            daysCount: scheduleDays.length,
            blocksCount: scheduleBlocks.length,
            days: scheduleDays,
            hasBlocks: scheduleBlocks.length > 0,
            hasDays: scheduleDays.length > 0,
        };
    } catch (error) {
        throw new Error(`Failed to get schedule structure info: ${error.message}`);
    }
};

/**
 * ========================================
 * EVENT DEPENDENCIES REPOSITORY FUNCTIONS
 * ========================================
 */

/**
 * Create or update event dependencies for a schedule
 * @param {string} scheduleId - Schedule UUID
 * @param {Object} dependenciesMap - Dependencies map object
 * @param {string} userId - User ID for ownership validation
 * @returns {Promise<Object>} Created/updated dependencies record
 */
export const upsertEventDependencies = async (scheduleId, dependenciesMap, userId) => {
    try {
        // Verify schedule ownership first
        const schedule = await getScheduleById(scheduleId, userId);
        if (!schedule) {
            throw new Error('Schedule not found or access denied');
        }

        // Check if dependencies already exist
        const existingDeps = await getEventDependenciesByScheduleId(scheduleId, userId);

        if (existingDeps) {
            // Update existing record
            const [updated] = await db
                .update(dependencies)
                .set({
                    dependenciesMap,
                    updatedAt: new Date(),
                })
                .where(eq(dependencies.scheduleId, scheduleId))
                .returning();

            return updated;
        } else {
            // Create new record
            const [created] = await db
                .insert(dependencies)
                .values({
                    scheduleId,
                    dependenciesMap,
                })
                .returning();

            return created;
        }
    } catch (error) {
        console.error('Error upserting event dependencies:', error);
        throw error;
    }
};

/**
 * Get event dependencies by schedule ID
 * @param {string} scheduleId - Schedule UUID
 * @param {string} userId - User ID for ownership validation
 * @returns {Promise<Object|null>} Dependencies record or null
 */
export const getEventDependenciesByScheduleId = async (scheduleId, userId) => {
    try {
        // Verify schedule ownership first
        const schedule = await getScheduleById(scheduleId, userId);
        if (!schedule) {
            throw new Error('Schedule not found or access denied');
        }

        const [dependencyRecord] = await db
            .select()
            .from(dependencies)
            .where(eq(dependencies.scheduleId, scheduleId))
            .limit(1);

        return dependencyRecord || null;
    } catch (error) {
        console.error('Error fetching event dependencies:', error);
        throw error;
    }
};

/**
 * Update event dependencies by ID
 * @param {string} dependenciesId - Dependencies UUID
 * @param {Object} dependenciesMap - Updated dependencies map
 * @param {string} userId - User ID for ownership validation
 * @returns {Promise<Object>} Updated dependencies record
 */
export const updateEventDependenciesById = async (dependenciesId, dependenciesMap, userId) => {
    try {
        // Get the dependencies record first to check schedule ownership
        const [existingDeps] = await db
            .select({
                id: dependencies.id,
                scheduleId: dependencies.scheduleId,
            })
            .from(dependencies)
            .where(eq(dependencies.id, dependenciesId))
            .limit(1);

        if (!existingDeps) {
            throw new Error('Event dependencies not found');
        }

        // Verify schedule ownership
        const schedule = await getScheduleById(existingDeps.scheduleId, userId);
        if (!schedule) {
            throw new Error('Schedule not found or access denied');
        }

        // Update the dependencies
        const [updated] = await db
            .update(dependencies)
            .set({
                dependenciesMap,
                updatedAt: new Date(),
            })
            .where(eq(dependencies.id, dependenciesId))
            .returning();

        return updated;
    } catch (error) {
        console.error('Error updating event dependencies:', error);
        throw error;
    }
};

/**
 * Delete event dependencies by schedule ID
 * @param {string} scheduleId - Schedule UUID
 * @param {string} userId - User ID for ownership validation
 * @returns {Promise<boolean>} Success status
 */
export const deleteEventDependenciesByScheduleId = async (scheduleId, userId) => {
    try {
        // Verify schedule ownership first
        const schedule = await getScheduleById(scheduleId, userId);
        if (!schedule) {
            throw new Error('Schedule not found or access denied');
        }

        const result = await db
            .delete(dependencies)
            .where(eq(dependencies.scheduleId, scheduleId))
            .returning();

        return result.length > 0;
    } catch (error) {
        console.error('Error deleting event dependencies:', error);
        throw error;
    }
};
