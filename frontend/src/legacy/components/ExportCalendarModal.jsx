import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import Modal from 'react-native-modal';
import { useAppState } from '../../context/AppStateContext.js';
import { lightColor, darkColor } from '../../design/colors.js';
import { spacing, padding } from '../../design/spacing.js';
import { typography } from '../../design/typography.js';
import Google from '../../assets/auth/Google.svg';
import Apple from '../../assets/auth/Apple.svg';

const { width, height } = Dimensions.get('window');
const SPACE =
    height > 900 ? spacing.SPACING_4 : height > 800 ? spacing.SPACING_3 : spacing.SPACING_2;

const ExportCalendarModal = ({ isVisible, onClose, onExportGoogle, onExportApple }) => {
    const { appState } = useAppState();
    const theme = appState.userPreferences.theme === 'light' ? lightColor : darkColor;

    const handleGoogleExport = () => {
        onClose();
        onExportGoogle();
    };

    const handleAppleExport = () => {
        onClose();
        onExportApple();
    };

    return (
        <Modal
            isVisible={isVisible}
            onBackdropPress={onClose}
            onSwipeComplete={onClose}
            swipeDirection="down"
            style={styles.modal}
            backdropOpacity={0.5}
            animationIn="slideInUp"
            animationOut="slideOutDown"
            animationInTiming={300}
            animationOutTiming={300}
        >
            <View style={[styles.container, { backgroundColor: theme.BACKGROUND }]}>
                {/* Header */}
                <View style={styles.header}>
                    <View style={[styles.handle, { backgroundColor: theme.INPUT }]} />
                    <Text style={[styles.title, { color: theme.FOREGROUND }]}>Export Schedule</Text>
                    <Text style={[styles.subtitle, { color: theme.FOREGROUND }]}>
                        Choose where to export your schedule
                    </Text>
                </View>

                {/* Export Options */}
                <View style={styles.optionsContainer}>
                    {/* Google Calendar Option */}
                    <TouchableOpacity
                        style={[styles.optionButton, { backgroundColor: theme.CARD_BACKGROUND }]}
                        onPress={handleGoogleExport}
                        activeOpacity={0.7}
                    >
                        <View style={styles.optionContent}>
                            <View style={styles.iconContainer}>
                                <Google width={32} height={32} />
                            </View>
                            <View style={styles.textContainer}>
                                <Text style={[styles.optionTitle, { color: theme.FOREGROUND }]}>
                                    Google Calendar
                                </Text>
                                <Text
                                    style={[
                                        styles.optionDescription,
                                        { color: theme.FOREGROUND_MUTED },
                                    ]}
                                >
                                    Export to your Google Calendar
                                </Text>
                            </View>
                        </View>
                    </TouchableOpacity>

                    {/* Apple Calendar Option */}
                    <TouchableOpacity
                        style={[styles.optionButton, { backgroundColor: theme.CARD_BACKGROUND }]}
                        onPress={handleAppleExport}
                        activeOpacity={0.7}
                    >
                        <View style={styles.optionContent}>
                            <View style={styles.iconContainer}>
                                <Apple width={32} height={32} />
                            </View>
                            <View style={styles.textContainer}>
                                <Text style={[styles.optionTitle, { color: theme.FOREGROUND }]}>
                                    Apple Calendar
                                </Text>
                                <Text
                                    style={[
                                        styles.optionDescription,
                                        { color: theme.FOREGROUND_MUTED },
                                    ]}
                                >
                                    Export to your device calendar
                                </Text>
                            </View>
                        </View>
                    </TouchableOpacity>
                </View>

                {/* Cancel Button */}
                <TouchableOpacity
                    style={[
                        styles.cancelButton,
                        { backgroundColor: theme.FOREGROUND_MUTED + '20' },
                    ]}
                    onPress={onClose}
                    activeOpacity={0.7}
                >
                    <Text style={[styles.cancelText, { color: theme.FOREGROUND_MUTED }]}>
                        Cancel
                    </Text>
                </TouchableOpacity>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    modal: {
        justifyContent: 'flex-end',
        margin: 0,
    },
    container: {
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        paddingHorizontal: padding.SCREEN_PADDING,
        paddingBottom: 40,
        paddingTop: 20,
        minHeight: 280,
    },
    header: {
        alignItems: 'center',
        marginBottom: SPACE * 2,
    },
    handle: {
        width: 40,
        height: 4,
        borderRadius: 2,
        marginBottom: SPACE,
    },
    title: {
        fontSize: typography.headingSize,
        fontFamily: 'AlbertSans',
        fontWeight: '600',
        marginBottom: SPACE / 2,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: typography.bodySize,
        fontFamily: 'AlbertSans',
        textAlign: 'center',
        lineHeight: 20,
    },
    optionsContainer: {
        gap: SPACE,
        marginBottom: SPACE * 2,
    },
    optionButton: {
        borderRadius: 12,
        padding: SPACE * 1.5,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    optionContent: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    iconContainer: {
        width: 48,
        height: 48,
        borderRadius: 12,
        backgroundColor: '#F8F9FA',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: SPACE,
    },
    textContainer: {
        flex: 1,
    },
    optionTitle: {
        fontSize: typography.bodySize + 2,
        fontFamily: 'AlbertSans',
        fontWeight: '600',
        marginBottom: 4,
    },
    optionDescription: {
        fontSize: typography.bodySize - 2,
        fontFamily: 'AlbertSans',
        lineHeight: 16,
    },
    cancelButton: {
        borderRadius: 12,
        padding: SPACE,
        alignItems: 'center',
    },
    cancelText: {
        fontSize: typography.bodySize,
        fontFamily: 'AlbertSans',
        fontWeight: '500',
    },
});

export default ExportCalendarModal;
