/**
 * Represents a time in 24-hour format (e.g., 930 for 9:30 AM, 1745 for 5:45 PM).
 */
class Time24 {
    /**
     * @param {number} time - The time in 24-hour int format (e.g., 930, 1745)
     */
    constructor(time) {
        this.hour = Math.floor(time / 100);
        this.minute = time % 100;
        this._normalize();
    }

    /**
     * Adds the given number of minutes to the current time
     * @param {number} mins
     */
    addMinutes(mins) {
        let total = this.hour * 60 + this.minute + mins;
        this.hour = Math.floor(total / 60);
        this.minute = total % 60;
        this._normalize();
    }

    /**
     * Subtracts the given number of minutes from the current time
     * @param {number} mins
     */
    subtractMinutes(mins) {
        let total = this.hour * 60 + this.minute - mins;
        this.hour = Math.floor(total / 60);
        this.minute = total % 60;
        this._normalize();
    }

    /**
     * Adjusts hour and minute fields to stay within valid 24-hour ranges
     * @private
     */
    _normalize() {
        if (this.minute >= 60) {
            this.hour += Math.floor(this.minute / 60);
            this.minute %= 60;
        } else if (this.minute < 0) {
            const borrow = Math.ceil(Math.abs(this.minute) / 60);
            this.hour -= borrow;
            this.minute += borrow * 60;
        }

        if (this.hour < 0) {
            this.hour = 0;
            this.minute = 0;
        }
    }

    /** @returns {number} the hour component */
    getHour() {
        return this.hour;
    }

    /** @returns {number} the minute component */
    getMinute() {
        return this.minute;
    }

    /**
     * @param {Time24} other
     * @returns {boolean} true if this time is before the other time
     */
    isBefore(other) {
        return this.toInt() < other.toInt();
    }

    /**
     * @param {Time24} other
     * @returns {boolean} true if this time is after the other time
     */
    isAfter(other) {
        return this.toInt() > other.toInt();
    }

    /**
     * @returns {number} time in 24-hour int format (e.g., 930, 1745)
     */
    toInt() {
        return this.hour * 100 + this.minute;
    }

    /**
     * @returns {Time24} a copy of this object
     */
    copy() {
        return new Time24(this.toInt());
    }

    /**
     * @param {any} other
     * @returns {boolean} true if other is a Time24 with same hour and minute
     */
    equals(other) {
        return other instanceof Time24 && this.hour === other.hour && this.minute === other.minute;
    }

    /**
     * @returns {string} string representation in "HH:MM" format
     */
    toString() {
        const paddedMinute = this.minute < 10 ? `0${this.minute}` : `${this.minute}`;
        return `${this.hour}:${paddedMinute}`;
    }

    /**
     * @returns {string} a 12-hour string representation in "HH:MM AM/PM" format
     */
    to12HourString() {
        const suffix = this.hour < 12 ? 'AM' : 'PM';
        const fixedHour = this.hour == 0 ? 12 : this.hour <= 12 ? this.hour : this.hour - 12;
        const paddedMinute = this.minute < 10 ? `0${this.minute}` : `${this.minute}`;
        return `${fixedHour}:${paddedMinute} ${suffix}`;
    }
}

export default Time24;
