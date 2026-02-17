import React, { useContext } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Modal from 'react-native-modal';
import { useAppState } from '../context/AppStateContext';
import { lightColor, darkColor } from '../design/colors.js';

const AbandonSchedulingModal = ({ isVisible, goTo, onClose, goToName }) => {
    const { appState } = useAppState();
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
                        Abandon Scheduling
                    </Text>
                    <Text style={{ ...styles.text, color: theme.FOREGROUND }}>
                        Are you sure you want to abandon the scheduling process to go to the{' '}
                        {goToName} screen?
                    </Text>
                </View>
                <View style={{ flexDirection: 'row', gap: 8, alignSelf: 'flex-end' }}>
                    <TouchableOpacity
                        onPress={onClose}
                        style={{
                            backgroundColor: '#E0E0E0',
                            paddingVertical: 12,
                            paddingHorizontal: 24,
                            borderRadius: 24,
                        }}
                    >
                        <Text style={{ color: '#000', fontFamily: 'AlbertSans' }}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        onPress={() => {
                            goTo();
                            onClose();
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
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    card: {
        width: 361,
        height: 200,
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
        fontSize: 32,
        fontFamily: 'PinkSunset',
        marginBottom: 16,
    },
    text: {
        fontSize: 16,
        fontFamily: 'AlbertSans',
        marginBottom: 24,
    },
});

export default AbandonSchedulingModal;
