import { Alert, Platform } from 'react-native';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { exportICS } from './exportICS'; // <- your function that returns the ICS string

export const exportAndOpenICS = async (userName, schedule, options = {}) => {
    try {
        // 1) Generate ICS text
        const icsText = exportICS(schedule, {
            calendarName: 'Plannr',
            timezoneMode: 'utc',
            ...options,
        });

        // 2) Create a file in cache
        const filename = `plannr-${userName}-schedule-${Date.now()}.ics`;
        const file = new File(Paths.cache, filename);

        // create() throws if it already exists — using Date.now() avoids collisions
        file.create();
        file.write(icsText);

        // 3) Open share sheet (best UX for Apple + Google import paths)
        const canShare = await Sharing.isAvailableAsync();
        if (!canShare) {
            Alert.alert(
                'Export created',
                `Saved .ics file at:\n${file.uri}\n\nSharing isn't available on this device.`,
            );
            return file.uri;
        }

        await Sharing.shareAsync(file.uri, {
            mimeType: 'text/calendar',
            dialogTitle: 'Export schedule',
            // iOS hint
            UTI: Platform.OS === 'ios' ? 'public.ics' : undefined,
        });

        return file.uri;
    } catch (error) {
        console.error(error);
        Alert.alert('Export failed', 'Could not export your schedule. Please try again.');
        return null;
    }
};
