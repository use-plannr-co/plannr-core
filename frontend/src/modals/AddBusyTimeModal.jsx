import React, { useState, useEffect } from 'react';
import {
    Text,
    View,
    StyleSheet,
    TouchableOpacity,
    TextInput,
    Platform,
    Keyboard,
    TouchableWithoutFeedback,
    KeyboardAvoidingView,
} from 'react-native';
import Modal from 'react-native-modal';
import { useAppState } from '../context/AppStateContext.js';
import { lightColor, darkColor } from '../design/colors.js';
import { typography } from '../design/typography.js';

const AddBusyTimeModal = ({ isVisible, onAdd, onClose }) => {
    const { appState } = useAppState();
    let theme = appState.userPreferences.theme === 'light' ? lightColor : darkColor;

    const [name, setName] = useState('');
    const [warning, setWarning] = useState('');
    const [showWarning, setShowWarning] = useState(false);
    const [keyboardVisible, setKeyboardVisible] = useState(false);

    // Keyboard visibility listeners
    useEffect(() => {
        const keyboardDidShowListener = Keyboard.addListener('keyboardDidShow', () =>
            setKeyboardVisible(true),
        );
        const keyboardDidHideListener = Keyboard.addListener('keyboardDidHide', () =>
            setKeyboardVisible(false),
        );

        return () => {
            keyboardDidShowListener?.remove();
            keyboardDidHideListener?.remove();
        };
    }, []);

    const resetToDefaults = () => {
        setName('');
        setWarning('');
        setShowWarning(false);
    };

    const handleOutsidePress = () => {
        if (keyboardVisible) {
            Keyboard.dismiss(); // Just dismiss keyboard, keep modal open
        } else {
            // Keyboard is already dismissed, close modal
            resetToDefaults();
            onClose && onClose();
        }
    };

    const handleAddTimeBlock = () => {
        if (name.trim().length === 0) {
            setWarning('Time block name cannot be empty');
            setShowWarning(true);
            return;
        }

        // Call the onAdd callback with the name
        onAdd(name.trim());

        // Reset and close
        resetToDefaults();
        onClose && onClose();
    };

    return (
        <Modal
            isVisible={isVisible}
            style={{ justifyContent: 'center', alignItems: 'center' }}
            animationInTiming={500}
            animationOutTiming={500}
        >
            <TouchableWithoutFeedback onPress={handleOutsidePress} accessible={false}>
                <View style={styles.modalOverlay}>
                    <KeyboardAvoidingView
                        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                        keyboardVerticalOffset={20}
                    >
                        <TouchableWithoutFeedback
                            onPress={(e) => e.stopPropagation()}
                            accessible={false}
                        >
                            <View style={{ ...styles.card, backgroundColor: theme.COMP_COLOR }}>
                                <Text style={{ ...styles.title, color: theme.FOREGROUND }}>
                                    Add Busy Time
                                </Text>

                                {/* Name Input */}
                                <View style={{ marginBottom: 20 }}>
                                    <Text style={{ ...styles.subHeading, color: theme.FOREGROUND }}>
                                        Name
                                    </Text>
                                    <TextInput
                                        style={{
                                            ...styles.input,
                                            backgroundColor: theme.INPUT,
                                            color: theme.FOREGROUND,
                                        }}
                                        value={name}
                                        autoCorrect={false}
                                        autoCapitalize="words"
                                        placeholder="e.g., Gym, Class, Meeting"
                                        placeholderTextColor={theme.PLACEHOLDER}
                                        onChangeText={(text) => {
                                            setName(text);
                                            if (showWarning) {
                                                setShowWarning(false);
                                                setWarning('');
                                            }
                                        }}
                                        onSubmitEditing={handleAddTimeBlock}
                                        returnKeyType="done"
                                    />
                                </View>

                                {showWarning && <Text style={styles.warning}>{warning}</Text>}

                                {/* Add Button */}
                                <TouchableOpacity
                                    style={styles.button}
                                    onPress={handleAddTimeBlock}
                                >
                                    <Text
                                        style={{
                                            color: '#FFF',
                                            fontFamily: 'AlbertSans',
                                            alignSelf: 'center',
                                        }}
                                    >
                                        Add Time Block
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        </TouchableWithoutFeedback>
                    </KeyboardAvoidingView>
                </View>
            </TouchableWithoutFeedback>
        </Modal>
    );
};

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        width: '100%',
        height: '100%',
    },
    card: {
        width: '99%',
        borderRadius: 12,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 0,
        },
        shadowOpacity: 0.1,
        shadowRadius: 6,
        padding: 24,
        alignSelf: 'center',
    },
    title: {
        fontSize: typography.subHeadingSize + 2,
        fontFamily: 'AlbertSans',
        fontWeight: '600',
        marginBottom: 20,
        textAlign: 'center',
    },
    subHeading: {
        fontSize: typography.subHeadingSize,
        fontFamily: 'AlbertSans',
        marginBottom: 8,
    },
    input: {
        height: 48,
        borderRadius: 12,
        fontSize: typography.subHeadingSize,
        fontFamily: 'AlbertSans',
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    button: {
        width: '100%',
        borderRadius: 12,
        backgroundColor: '#000',
        paddingVertical: 12,
        paddingHorizontal: 16,
        marginTop: 8,
        alignSelf: 'center',
    },
    warning: {
        fontSize: typography.bodySize,
        fontFamily: 'AlbertSans',
        marginBottom: 12,
        color: '#FF0000',
        alignSelf: 'center',
    },
});

export default AddBusyTimeModal;
