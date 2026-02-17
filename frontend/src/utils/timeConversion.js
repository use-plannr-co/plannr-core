import Time24 from '../model/Time24';

/**
 * Converts a JS Date object to a 24-hour time format number (e.g., 1430 for 2:30 PM).
 * @param {Date} dateObj - A JavaScript Date object
 * @returns {number} time in 24-hour HHMM format
 */
const convertTimeToTime24 = (dateObj) => {
    const hours = dateObj.getHours(); // 0–23
    const minutes = dateObj.getMinutes(); // 0–59

    return new Time24(hours * 100 + minutes);
};

export default convertTimeToTime24;
