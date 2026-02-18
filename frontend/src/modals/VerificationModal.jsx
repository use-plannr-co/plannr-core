import React, { useState, useRef, useEffect } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    Dimensions,
    TouchableWithoutFeedback,
    Keyboard,
} from 'react-native';
import Modal from 'react-native-modal';

import { useAppState } from '../context/AppStateContext.js';
import { lightColor, darkColor } from '../design/colors.js';
import { typography } from '../design/typography.js';
import { spacing } from '../design/spacing.js';

const { height } = Dimensions.get('window');
const SPACE =
    height > 900 ? spacing.SPACING_4 : height > 800 ? spacing.SPACING_3 : spacing.SPACING_2;

const VerificationModal = ({ isVisible, onVerifyCode, onClose, email, loading }) => {
    const { appState } = useAppState();
    const theme = appState.userPreferences.theme === 'light' ? lightColor : darkColor;

    const [code, setCode] = useState(['', '', '', '', '', '']);
    const [focusedIndex, setFocusedIndex] = useState(0);
    const inputRefs = useRef([]);

    // Initialize input refs
    useEffect(() => {
        inputRefs.current = inputRefs.current.slice(0, 6);
    }, []);

    // Reset code when modal becomes visible
    useEffect(() => {
        if (isVisible) {
            setCode(['', '', '', '', '', '']);
            setFocusedIndex(0);
            // Focus first input after modal animation
            setTimeout(() => {
                inputRefs.current[0]?.focus();
            }, 500);
        }
    }, [isVisible]);

    const handleCodeChange = (text, index) => {
        // Only allow single digit
        const digit = text.slice(-1);

        const newCode = [...code];
        newCode[index] = digit;
        setCode(newCode);

        // Move to next input if digit entered
        if (digit && index < 5) {
            setFocusedIndex(index + 1);
            inputRefs.current[index + 1]?.focus();
        }

        // Auto-submit when all 6 digits are entered
        if (index === 5 && digit) {
            const fullCode = newCode.join('');
            if (fullCode.length === 6) {
                setTimeout(() => handleVerify(fullCode), 100);
            }
        }
    };

    const handleKeyPress = (e, index) => {
        // Handle backspace
        if (e.nativeEvent.key === 'Backspace' && !code[index] && index > 0) {
            setFocusedIndex(index - 1);
            inputRefs.current[index - 1]?.focus();
        }
    };

    const handleVerify = (verificationCode = null) => {
        const fullCode = verificationCode || code.join('');
        if (fullCode.length === 6) {
            onVerifyCode(fullCode);
        }
    };

    const handleResendCode = () => {
        // TODO: Add resend functionality
        console.log('Resend code');
    };

    const isCodeComplete = code.every((digit) => digit !== '');

    return (
        <Modal
            isVisible={isVisible}
            style={styles.modal}
            animationInTiming={500}
            animationOutTiming={500}
            backdropOpacity={0.5}
            onBackdropPress={onClose}
            onBackButtonPress={onClose}
            avoidKeyboard={true}
        >
            <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                <View style={[styles.container, { backgroundColor: theme.COMP_COLOR }]}>
                    {/* Header */}
                    <View style={styles.header}>
                        <Text style={[styles.title, { color: theme.FOREGROUND }]}>
                            Verify Your Email
                        </Text>
                        <Text style={[styles.subtitle, { color: theme.FOREGROUND + '80' }]}>
                            We sent a 6-digit code to {email}
                        </Text>
                    </View>

                    {/* Code Input Fields */}
                    <View style={styles.codeContainer}>
                        {code.map((digit, index) => (
                            <TextInput
                                key={index}
                                ref={(el) => (inputRefs.current[index] = el)}
                                style={[
                                    styles.codeInput,
                                    {
                                        backgroundColor: theme.INPUT,
                                        color: theme.FOREGROUND,
                                        borderColor:
                                            focusedIndex === index ? '#000' : 'transparent',
                                        borderWidth: focusedIndex === index ? 2 : 0,
                                    },
                                ]}
                                value={digit}
                                onChangeText={(text) => handleCodeChange(text, index)}
                                onKeyPress={(e) => handleKeyPress(e, index)}
                                onFocus={() => setFocusedIndex(index)}
                                keyboardType="numeric"
                                maxLength={1}
                                textAlign="center"
                                selectTextOnFocus
                            />
                        ))}
                    </View>

                    {/* Verify Button */}
                    <TouchableOpacity
                        style={[
                            styles.button,
                            { backgroundColor: isCodeComplete ? '#000' : '#888' },
                        ]}
                        onPress={() => handleVerify()}
                        disabled={!isCodeComplete || loading}
                    >
                        <Text style={styles.buttonText}>
                            {loading ? 'Verifying...' : 'Verify Code'}
                        </Text>
                    </TouchableOpacity>

                    {/* Resend Code */}
                    <TouchableOpacity style={styles.resendButton} onPress={handleResendCode}>
                        <Text style={[styles.resendText, { color: theme.FOREGROUND + '80' }]}>
                            Didn't receive the code? Resend
                        </Text>
                    </TouchableOpacity>

                    {/* Cancel Button */}
                    <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
                        <Text style={[styles.cancelText, { color: theme.FOREGROUND + '60' }]}>
                            Cancel
                        </Text>
                    </TouchableOpacity>
                </View>
            </TouchableWithoutFeedback>
        </Modal>
    );
};

const styles = StyleSheet.create({
    modal: {
        justifyContent: 'center',
        alignItems: 'center',
        margin: 20,
    },
    container: {
        width: '100%',
        borderRadius: 12,
        paddingVertical: 24,
        paddingHorizontal: 20,
        alignItems: 'center',
    },
    header: {
        alignItems: 'center',
        marginBottom: SPACE * 1.5,
    },
    title: {
        fontSize: typography.headingSize,
        fontFamily: 'AlbertSans',
        fontWeight: 'bold',
        marginBottom: SPACE / 2,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: typography.bodySize,
        fontFamily: 'AlbertSans',
        textAlign: 'center',
        lineHeight: typography.bodySize * 1.4,
    },
    codeContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: SPACE * 1.5,
        width: '100%',
        paddingHorizontal: 10,
    },
    codeInput: {
        width: 45,
        height: 55,
        borderRadius: 12,
        fontSize: typography.headingSize,
        fontFamily: 'AlbertSans',
        fontWeight: 'bold',
    },
    button: {
        width: '100%',
        borderRadius: 12,
        paddingVertical: 16,
        paddingHorizontal: 16,
        flexDirection: 'row',
        justifyContent: 'center',
        marginBottom: SPACE,
    },
    buttonText: {
        color: '#FFF',
        fontFamily: 'AlbertSans',
        fontSize: typography.subHeadingSize,
        fontWeight: 'bold',
    },
    resendButton: {
        paddingVertical: 8,
        marginBottom: SPACE / 2,
    },
    resendText: {
        fontFamily: 'AlbertSans',
        fontSize: typography.bodySize,
        textDecorationLine: 'underline',
    },
    cancelButton: {
        paddingVertical: 8,
    },
    cancelText: {
        fontFamily: 'AlbertSans',
        fontSize: typography.bodySize,
    },
});

export default VerificationModal;
