import ScheduleDate from '../model/ScheduleDate.js';

const convertDateToScheduleDate = (dateObj) => {
    const day = dateObj.getDate();
    const month = dateObj.getMonth() + 1;
    const year = dateObj.getFullYear();

    return new ScheduleDate(day, month, year);
};

export default convertDateToScheduleDate;
