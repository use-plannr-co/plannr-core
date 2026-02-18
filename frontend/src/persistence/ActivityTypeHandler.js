import ActivityType from '../model/ActivityType.js';

export const serializeActivityType = (activityType) => {
    return activityType;
};

export const parseActivityType = (rawObj) => {
    if (Object.values(ActivityType).includes(rawObj)) {
        return ActivityType[rawObj];
    }
    return ActivityType.OTHER;
};
