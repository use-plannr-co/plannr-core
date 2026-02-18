import ScheduleDate from '../model/ScheduleDate.js';

export const serializeScheduleDate = (dateObj) => {
    if (!dateObj) return null;

    return {
        date: dateObj.date,
        month: dateObj.month,
        year: dateObj.year,
    };
};

export const parseScheduleDate = (rawObj) => {
    if (!rawObj || rawObj.date == null || rawObj.month == null || rawObj.year == null) {
        return null;
    }

    return new ScheduleDate(rawObj.date, rawObj.month, rawObj.year);
};
