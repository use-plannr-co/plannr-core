import EventDependencies from '../model/EventDependencies.js';
import RigidEvent from '../model/RigidEvent.js';
import FlexibleEvent from '../model/FlexibleEvent.js';
import { serializeRigidEvent, parseRigidEvent } from './RigidEventHandler.js';
import { serializeFlexibleEvent, parseFlexibleEvent } from './FlexibleEventHandler.js';

export const serializeEventDependencies = (eventDeps) => {
    if (!eventDeps) return null;

    const result = [];
    const depMap = eventDeps.getDependencies();

    for (const [event, deps] of depMap.entries()) {
        let serializedEvent = null;
        if (event instanceof RigidEvent) {
            serializedEvent = serializeRigidEvent(event);
        } else if (event instanceof FlexibleEvent) {
            serializedEvent = serializeFlexibleEvent(event);
        }
        if (!serializedEvent) continue;

        const serializedDeps = [];
        for (const dep of deps) {
            if (dep instanceof RigidEvent) {
                serializedDeps.push(serializeRigidEvent(dep));
            } else if (dep instanceof FlexibleEvent) {
                serializedDeps.push(serializeFlexibleEvent(dep));
            }
        }

        result.push([serializedEvent, serializedDeps]);
    }

    return result;
};

export const parseEventDependencies = (rawArr) => {
    if (!rawArr || !Array.isArray(rawArr)) return null;

    const depMap = new Map();

    for (const pair of rawArr) {
        if (!Array.isArray(pair) || pair.length !== 2) continue;
        const rawEvent = pair[0];
        const rawDeps = Array.isArray(pair[1]) ? pair[1] : [];

        let event = null;
        if (rawEvent && rawEvent.deadline != null) {
            event = parseFlexibleEvent(rawEvent);
        } else if (
            rawEvent &&
            rawEvent.date != null &&
            rawEvent.startTime != null &&
            rawEvent.endTime != null
        ) {
            event = parseRigidEvent(rawEvent);
        }
        if (!event) continue;

        const depsList = [];
        for (const rawDep of rawDeps) {
            let dep = null;
            if (rawDep && rawDep.deadline != null) {
                dep = parseFlexibleEvent(rawDep);
            } else if (
                rawDep &&
                rawDep.date != null &&
                rawDep.startTime != null &&
                rawDep.endTime != null
            ) {
                dep = parseRigidEvent(rawDep);
            }
            if (dep) depsList.push(dep);
        }

        depMap.set(event, depsList);
    }

    return new EventDependencies(depMap);
};
