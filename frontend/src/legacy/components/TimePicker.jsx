import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import Time24 from '../../model/Time24.js';
import { lightColor, darkColor } from '../../design/colors.js';
import { useAppState } from '../../context/AppStateContext.js';

const TimePicker = ({ value, onChange }) => {
    const { appState } = useAppState();
    let theme = appState.userPreferences.theme === 'light' ? lightColor : darkColor;

    const initialHour =
        value.getHour() === 0 ? 12 : value.getHour() > 12 ? value.getHour() - 12 : value.getHour();
    const initialMinute = value.getMinute();
    const initialMeridian = value.getHour() >= 12 ? 'PM' : 'AM';

    const [selectedHour, setSelectedHour] = useState(initialHour);
    const [selectedMinute, setSelectedMinute] = useState(initialMinute);
    const [selectedMeridian, setSelectedMeridian] = useState(initialMeridian);

    // Helper function to convert 12-hour format to 24-hour format
    const convertTo24Hour = (hour12, meridian) => {
        if (meridian === 'AM') {
            return hour12 === 12 ? 0 : hour12;
        } else {
            // PM
            return hour12 === 12 ? 12 : hour12 + 12;
        }
    };

    // Helper function to update the parent component
    const updateTime = (hour, minute, meridian) => {
        const hour24 = convertTo24Hour(hour, meridian);
        onChange(new Time24(hour24 * 100 + minute));
    };

    return (
        <View style={styles.container}>
            {/* Hour Picker (1-12) */}
            <Picker
                selectedValue={selectedHour}
                onValueChange={(itemValue) => {
                    setSelectedHour(itemValue);
                    updateTime(itemValue, selectedMinute, selectedMeridian);
                }}
                style={styles.picker}
                themeVariant={appState.userPreferences.theme}
                height={60}
            >
                {Array.from({ length: 12 }, (_, i) => i + 1).map((hour) => (
                    <Picker.Item key={hour} label={hour.toString()} value={hour} />
                ))}
            </Picker>

            {/* Minute Picker (00-59) */}
            <Picker
                selectedValue={selectedMinute}
                onValueChange={(itemValue) => {
                    setSelectedMinute(itemValue);
                    updateTime(selectedHour, itemValue, selectedMeridian);
                }}
                style={styles.picker}
                themeVariant={appState.userPreferences.theme}
                height={60}
            >
                {Array.from({ length: 60 }, (_, i) => i).map((minute) => (
                    <Picker.Item
                        key={minute}
                        label={minute.toString().padStart(2, '0')}
                        value={minute}
                    />
                ))}
            </Picker>

            {/* Meridian Picker (AM/PM) */}
            <Picker
                selectedValue={selectedMeridian}
                onValueChange={(itemValue) => {
                    setSelectedMeridian(itemValue);
                    updateTime(selectedHour, selectedMinute, itemValue);
                }}
                style={styles.picker}
                themeVariant={appState.userPreferences.theme}
                height={60}
            >
                <Picker.Item label="AM" value="AM" />
                <Picker.Item label="PM" value="PM" />
            </Picker>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    picker: {
        flex: 1,
        height: 60,
    },
});

export default TimePicker;
