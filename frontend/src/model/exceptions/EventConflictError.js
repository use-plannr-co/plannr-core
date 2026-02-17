/**
 * Thrown when an event conflicts with an existing scheduled event.
 */
class EventConflictError extends Error {
    constructor() {
        super('Event conflicts with existing event');
        this.name = 'EventConflictError';
    }
}

export default EventConflictError;
