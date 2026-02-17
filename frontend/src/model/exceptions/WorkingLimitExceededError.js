/**
 * Thrown when the working hours limit is exceeded.
 */
class WorkingLimitExceededError extends Error {
    constructor() {
        super('Working hours limit exceeded');
        this.name = 'WorkingLimitExceededError';
    }
}

export default WorkingLimitExceededError;
