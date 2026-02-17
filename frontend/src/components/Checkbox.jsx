import React, { useState } from 'react';
import { Image, StyleSheet, TouchableOpacity } from 'react-native';
import Checked from '../../assets/system-icons/Checked.svg';
import Unchecked from '../../assets/system-icons/Unchecked.svg';
import { useAppState } from '../context/AppStateContext.js';
import { lightColor, darkColor } from '../design/colors.js';
import { Dimensions } from 'react-native';
const { width } = Dimensions.get('window');

const checkboxSize = width > 400 ? 24 : width > 350 ? 20 : 16;

const Checkbox = ({ checked, onChange, needAbsolute = true }) => {
    const [isChecked, setIsChecked] = useState(checked);

    const { appState } = useAppState();
    let theme = appState.userPreferences.theme === 'light' ? lightColor : darkColor;

    const handlePress = () => {
        setIsChecked(!isChecked);
        onChange();
    };

    return needAbsolute ? (
        <TouchableOpacity style={styles.checkbox} onPress={handlePress}>
            {isChecked ? (
                <Checked width={checkboxSize} height={checkboxSize} color={theme.FOREGROUND} />
            ) : (
                <Unchecked width={checkboxSize} height={checkboxSize} color={theme.FOREGROUND} />
            )}
        </TouchableOpacity>
    ) : (
        <TouchableOpacity
            style={{ width: checkboxSize, height: checkboxSize }}
            onPress={handlePress}
        >
            {isChecked ? (
                <Checked width={checkboxSize} height={checkboxSize} color={theme.FOREGROUND} />
            ) : (
                <Unchecked width={checkboxSize} height={checkboxSize} color={theme.FOREGROUND} />
            )}
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    checkbox: {
        position: 'absolute',
        right: 16,
    },
});

export default Checkbox;
