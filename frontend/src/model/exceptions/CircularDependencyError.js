/**
 * Thrown when a circular dependency is detected between events.
 */
class CircularDependencyError extends Error {
    /**
     * @param {string} event1 - The first event in the cycle
     * @param {string} event2 - The second event in the cycle
     */
    constructor(event1, event2) {
        super(
            `Circular dependency detected: ${event1} already requires ${event2} as a dependency, and cannot be added as a dependency for ${event2}.`,
        );
        this.name = 'CircularDependencyError';
    }
}

export default CircularDependencyError;
