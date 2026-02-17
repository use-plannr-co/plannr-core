/**
 * Represents a date in the format of day-month-year.
 */
class ScheduleDate {
    /**
     * @param {number} date - The day
     * @param {number} month - The month
     * @param {number} year - The year
     */
    constructor(date, month, year) {
        this.date = date;
        this.month = month;
        this.year = year;
    }

    /** @returns {string} this date in "Month DaySuffix, Year" format */
    getDateString() {
        const monthNames = [
            '',
            'January',
            'February',
            'March',
            'April',
            'May',
            'June',
            'July',
            'August',
            'September',
            'October',
            'November',
            'December',
        ];

        const getOrdinalSuffix = (day) => {
            if (day >= 11 && day <= 13) return 'th';
            const lastDigit = day % 10;
            if (lastDigit === 1) return 'st';
            if (lastDigit === 2) return 'nd';
            if (lastDigit === 3) return 'rd';
            return 'th';
        };

        const monthName = monthNames[this.month];
        const daySuffix = getOrdinalSuffix(this.date);

        return `${monthName} ${this.date}${daySuffix}, ${this.year}`;
    }

    /** @returns {number} the day */
    getDate() {
        return this.date;
    }

    /** @returns {number} the month */
    getMonth() {
        return this.month;
    }

    /** @returns {number} the year */
    getYear() {
        return this.year;
    }

    /**
     * @param {ScheduleDate} other
     * @returns {boolean} true if this date is before the other
     */
    isBefore(other) {
        if (this.year < other.getYear()) return true;
        if (this.year === other.getYear()) {
            if (this.month < other.getMonth()) return true;
            if (this.month === other.getMonth()) {
                return this.date < other.getDate();
            }
        }
        return false;
    }

    /**
     * @param {ScheduleDate} other
     * @returns {boolean} true if this date is after the other
     */
    isAfter(other) {
        if (this.year > other.getYear()) return true;
        if (this.year === other.getYear()) {
            if (this.month > other.getMonth()) return true;
            if (this.month === other.getMonth()) {
                return this.date > other.getDate();
            }
        }
        return false;
    }

    /**
     * @returns {ScheduleDate} the date of the next day
     */
    getNextDate() {
        const monthsWith30Days = [4, 6, 9, 11];
        const monthsWith31Days = [1, 3, 5, 7, 8, 10, 12];

        let nextDate = this.date;
        let nextMonth = this.month;
        let nextYear = this.year;

        const isLeapYear = this.year % 4 === 0;

        if (monthsWith30Days.includes(this.month) && this.date === 30) {
            nextDate = 1;
            nextMonth += 1;
        } else if (monthsWith31Days.includes(this.month) && this.date === 31) {
            if (this.month === 12) {
                nextDate = 1;
                nextMonth = 1;
                nextYear += 1;
            } else {
                nextDate = 1;
                nextMonth += 1;
            }
        } else if (this.month === 2) {
            if ((isLeapYear && this.date === 29) || (!isLeapYear && this.date === 28)) {
                nextDate = 1;
                nextMonth = 3;
            } else {
                nextDate += 1;
            }
        } else {
            nextDate += 1;
        }

        return new ScheduleDate(nextDate, nextMonth, nextYear);
    }

    /**
     * @param {number} days - Number of days to add
     * @returns {ScheduleDate} the date after the given number of days
     */
    getDateAfter(days) {
        let result = new ScheduleDate(this.date, this.month, this.year);
        for (let i = 0; i < days; i++) {
            result = result.getNextDate();
        }
        return result;
    }

    /** @returns {String} the id of this ScheduleDate object */
    getId() {
        return `${this.date}-${this.month}-${this.year}`;
    }

    /**
     * @param {any} other
     * @returns {boolean} true if other is a ScheduleDate with the same date, month, and year
     */
    equals(other) {
        return (
            other instanceof ScheduleDate &&
            this.date === other.getDate() &&
            this.month === other.getMonth() &&
            this.year === other.getYear()
        );
    }
}

export default ScheduleDate;
