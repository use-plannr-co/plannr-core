import * as Notifications from 'expo-notifications';
import combineScheduleDateAndTime24 from '../utils/combineScheduleDateAndTime24.js';
import convertDateToScheduleDate from '../utils/dateConversion.js';
import Time24 from '../model/Time24.js';

const NotificationService = {
    async requestPermissions() {
        Notifications.setNotificationHandler({
            handleNotification: async () => ({
                shouldShowBanner: true,
                shouldShowList: true,
                shouldPlaySound: true,
                shouldSetBadge: true,
            }),
        });

        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;

        if (existingStatus !== 'granted') {
            const { status } = await Notifications.requestPermissionsAsync();
            finalStatus = status;
        }

        if (finalStatus !== 'granted') {
            console.warn('Notification permissions not granted');
            return false;
        }

        console.log('Notification permissions granted');
        return true;
    },

    async scheduleTaskReminder(timeBlock, leadMinutes) {
        // schedule notification X minutes before timeBlock.startTime
        try {
            const { name, date, startTime } = timeBlock;

            const triggerTime24 = startTime.copy();
            triggerTime24.subtractMinutes(leadMinutes);
            const notificationTime = combineScheduleDateAndTime24(date, triggerTime24);

            if (notificationTime <= new Date()) {
                // console.warn(`Skipping "${name}" reminder — trigger time is in the past.`);
                return null;
            }

            const notificationId = await Notifications.scheduleNotificationAsync({
                content: {
                    title: '⏰ Upcoming Task',
                    body: `Reminder: ${name} is set to begin at ${startTime.to12HourString()}`,
                    sound: true,
                    priority: Notifications.AndroidNotificationPriority.HIGH,
                },
                trigger: {
                    type: 'date',
                    date: notificationTime,
                },
            });

            // console.log(`Notification scheduled for "${name}" → ID: ${notificationId}`);
            return notificationId;
        } catch (error) {
            console.error(`Error scheduling reminder for "${timeBlock.name}":`, error);
            return null;
        }
    },

    async scheduleBreakReminder(timeBlock, leadMinutes) {
        // schedule notification X minutes before break
        try {
            const { date, startTime } = timeBlock;

            const triggerTime24 = startTime.copy();
            triggerTime24.subtractMinutes(leadMinutes);
            const notificationTime = combineScheduleDateAndTime24(date, triggerTime24);

            if (notificationTime <= new Date()) {
                // console.warn(`Skipping "Break" reminder — trigger time is in the past.`);
                return null;
            }

            const notificationId = await Notifications.scheduleNotificationAsync({
                content: {
                    title: '🧘 Get Some Rest',
                    body: `You have a break starting at ${startTime.to12HourString()}. Take a moment to relax!`,
                    sound: true,
                    priority: Notifications.AndroidNotificationPriority.HIGH,
                },
                trigger: {
                    type: 'date',
                    date: notificationTime,
                },
            });

            // console.log(`Notification scheduled for "Break" ${startTime.to12HourString()} → ID: ${notificationId}`);
            return notificationId;
        } catch (error) {
            console.error(`Error scheduling reminder for "${timeBlock.name}":`, error);
            return null;
        }
    },

    async cancelNotification(notificationId) {
        // cancel a scheduled notification by ID
        try {
            if (!notificationId) {
                console.warn('cancelNotification: No notification ID provided');
                return;
            }

            await Notifications.cancelScheduledNotificationAsync(notificationId);
            console.log(`Cancelled notification with ID: ${notificationId}`);
        } catch (error) {
            console.error(`Error cancelling notification ID ${notificationId}:`, error);
        }
    },

    async scheduleDailySummary(allTasksCompleted) {
        // daily summary at a fixed time
        try {
            const currentTime = new Date();
            const triggerDate = convertDateToScheduleDate(currentTime);
            const triggerTime = new Time24(2300);
            const notificationTime = combineScheduleDateAndTime24(triggerDate, triggerTime);

            if (notificationTime <= new Date()) {
                console.warn(`Skipping summary — trigger time is in the past.`);
                return null;
            }

            const content = allTasksCompleted
                ? {
                      title: '🎉 You slayed the day!',
                      body: 'Congrats on finishing all your tasks today!',
                      sound: true,
                      priority: Notifications.AndroidNotificationPriority.HIGH,
                  }
                : {
                      title: '📋 Unfinished Tasks',
                      body: 'You have some incomplete tasks today. Click to review or reschedule!',
                      sound: true,
                      priority: Notifications.AndroidNotificationPriority.HIGH,
                  };

            const notificationId = await Notifications.scheduleNotificationAsync({
                content,
                trigger: {
                    type: 'date',
                    date: notificationTime,
                },
            });

            console.log(
                `[Daily Summary] Scheduled for 11:00 PM → allComplete=${allTasksCompleted}, ID=${notificationId}`,
            );
            return notificationId;
        } catch (error) {
            console.error('Failed to schedule daily summary notification:', error);
            return null;
        }
    },

    async cancelAllNotifications() {
        // clear all pending notifications
        try {
            await Notifications.cancelAllScheduledNotificationsAsync();
        } catch (error) {
            console.error('❌ Failed to cancel all notifications:', error);
        }
    },

    async sendDummyNotification() {
        const notificationId = await Notifications.scheduleNotificationAsync({
            content: {
                title: '😭😭😭 Test Notification',
                body: 'This is a test notification. Please ignore.',
            },
            trigger: {
                type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
                seconds: 5,
            },
        });

        console.log('Dummy notification scheduled:', notificationId);
        const check = await Notifications.getAllScheduledNotificationsAsync();
        console.log(check);
    },
};

export default NotificationService;
