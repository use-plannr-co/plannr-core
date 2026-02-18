import React from 'react';
import { View, Image, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Modal from 'react-native-modal';
import { useAppState } from '../context/AppStateContext.js';
import { lightColor, darkColor } from '../design/colors.js';
import { typography } from '../design/typography.js';

const SchedulingErrorModal = ({ isVisible, action1, action2 }) => {
    const { appState, setAppState } = useAppState();
    let theme = appState.userPreferences.theme === 'light' ? lightColor : darkColor;

    return (
        <Modal
            isVisible={isVisible}
            style={{ justifyContent: 'center', alignItems: 'center' }}
            animationInTiming={500}
            animationOutTiming={500}
        >
            <View style={{ ...styles.card, backgroundColor: theme.COMP_COLOR }}>
                <View style={{ flexDirection: 'column', gap: 4, alignSelf: 'flex-start' }}>
                    <Text style={{ ...styles.heading, color: theme.FOREGROUND }}>
                        Scheduling Error
                    </Text>
                    <Image
                        source={require('../../assets/images/GenerationError.png')}
                        style={{ alignSelf: 'center', marginBottom: 8 }}
                    />
                    <Text style={{ ...styles.text, color: theme.FOREGROUND }}>
                        There is an error in generating your requested schedule. Would you like to
                        abandon the schedule or recheck the inputs?
                    </Text>
                    <Text style={{ ...styles.text, color: theme.FOREGROUND, marginBottom: 4 }}>
                        Try the following:
                    </Text>
                    <Text style={{ ...styles.text, color: theme.FOREGROUND, marginBottom: 4 }}>
                        - Change daily start and end times
                    </Text>
                    <Text style={{ ...styles.text, color: theme.FOREGROUND, marginBottom: 4 }}>
                        - Adjust breaks
                    </Text>
                    <Text style={{ ...styles.text, color: theme.FOREGROUND, marginBottom: 4 }}>
                        - Ensure no rigid events overlap
                    </Text>
                    <Text style={{ ...styles.text, color: theme.FOREGROUND, marginBottom: 20 }}>
                        - Ensure all flexible events have valid time slots
                    </Text>
                </View>
                <View style={{ flexDirection: 'row', gap: 8, alignSelf: 'flex-end' }}>
                    <TouchableOpacity
                        onPress={() => {
                            action1();
                        }}
                        style={{
                            backgroundColor: '#F00',
                            paddingVertical: 12,
                            paddingHorizontal: 24,
                            borderRadius: 24,
                        }}
                    >
                        <Text style={{ color: '#FFF', fontFamily: 'AlbertSans' }}>Abandon</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        onPress={() => {
                            action2();
                        }}
                        style={{
                            backgroundColor: '#E0E0E0',
                            paddingVertical: 12,
                            paddingHorizontal: 24,
                            borderRadius: 24,
                        }}
                    >
                        <Text style={{ color: '#000', fontFamily: 'AlbertSans' }}>Recheck</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    card: {
        borderRadius: 36,
        backgroundColor: '#FFFFFF',
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 0,
        },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        marginVertical: 16,
        padding: 24,
        flexDirection: 'column',
        justifyContent: 'space-between',
    },
    heading: {
        fontSize: typography.titleSize,
        fontFamily: 'PinkSunset',
        marginBottom: 16,
    },
    text: {
        fontSize: typography.subHeadingSize,
        fontFamily: 'AlbertSans',
        marginBottom: 24,
    },
});

export default SchedulingErrorModal;
