import React, { useState, useEffect } from 'react';
import {
    View,
    Image,
    Text,
    StyleSheet,
    TouchableOpacity,
    FlatList,
    Pressable,
    Platform,
    KeyboardAvoidingView,
    Keyboard,
} from 'react-native';
import Modal from 'react-native-modal';
import { Picker } from '@react-native-picker/picker';
import MultiSelect from '../components/MultiSelect.jsx';
import CrossIcon from '../../assets/system-icons/CrossIcon.svg';
import { useAppState } from '../context/AppStateContext.js';
import { lightColor, darkColor } from '../design/colors.js';
import { typography } from '../design/typography.js';

const AddDependencyModal = ({ isVisible, onClick, onClose, events }) => {
    const { appState } = useAppState();
    const theme = appState.userPreferences.theme === 'light' ? lightColor : darkColor;

    const [selectedEvent, setSelectedEvent] = useState(null);
    const [prerequisiteEvents, setPrerequisiteEvents] = useState([]);
    const [showSelectedEventPicker, setShowSelectedEventPicker] = useState(false);
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

    const setToDefaults = () => {
        setSelectedEvent(null);
        setPrerequisiteEvents([]);
        setShowSelectedEventPicker(false);
    };

    const handleOutsidePress = () => {
        if (keyboardVisible) {
            Keyboard.dismiss(); // Just dismiss keyboard, keep modal open
        } else {
            // Keyboard is already dismissed, close modal
            setToDefaults();
            onClose && onClose();
        }
    };

    return (
        <Modal
            isVisible={isVisible}
            style={{ justifyContent: 'center', alignItems: 'center' }}
            animationInTiming={500}
            animationOutTiming={500}
        >
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                keyboardVerticalOffset={20}
            >
                <View style={{ ...styles.card, backgroundColor: theme.BACKGROUND }}>
                    <Text style={{ ...styles.subHeading, color: theme.FOREGROUND }}>
                        Select an event
                    </Text>
                    <Pressable
                        style={{ ...styles.input, backgroundColor: theme.INPUT }}
                        onPress={() => setShowSelectedEventPicker(true)}
                    >
                        <Text
                            style={{
                                fontFamily: 'AlbertSans',
                                fontSize: typography.subHeadingSize,
                                color: theme.FOREGROUND,
                            }}
                        >
                            {selectedEvent ? selectedEvent.name : 'Choose an event'}
                        </Text>
                    </Pressable>
                    {showSelectedEventPicker && (
                        <View>
                            <Picker
                                selectedValue={selectedEvent?.id}
                                onValueChange={(itemId) => {
                                    const eventObj = events.find((e) => e.id === itemId);
                                    setSelectedEvent(eventObj);
                                }}
                                themeVariant={appState.userPreferences.theme}
                            >
                                {events.map((event) => (
                                    <Picker.Item
                                        key={event.name}
                                        label={event.name}
                                        value={event.id}
                                    />
                                ))}
                            </Picker>
                            <TouchableOpacity
                                style={{ ...styles.button, marginBottom: 16 }}
                                onPress={() => setShowSelectedEventPicker(false)}
                            >
                                <Text
                                    style={{
                                        color: '#FFF',
                                        fontFamily: 'AlbertSans',
                                        alignSelf: 'center',
                                    }}
                                >
                                    Select
                                </Text>
                            </TouchableOpacity>
                        </View>
                    )}
                    <Text style={{ ...styles.subHeading, color: theme.FOREGROUND }}>
                        Select all prerequisites for it
                    </Text>
                    <MultiSelect
                        currentSelected={selectedEvent}
                        items={events}
                        selectedItems={prerequisiteEvents}
                        onSelect={(events) => {
                            setPrerequisiteEvents(events);
                        }}
                    />
                    <View style={{ height: 56, justifyContent: 'center' }}>
                        <FlatList
                            horizontal
                            data={prerequisiteEvents}
                            keyExtractor={(item) => item.id}
                            renderItem={({ item }) => (
                                <View style={{ ...styles.chip, backgroundColor: theme.INPUT }}>
                                    <Text
                                        style={{
                                            fontFamily: 'AlbertSans',
                                            fontSize: typography.subHeadingSize,
                                            color: theme.FOREGROUND,
                                        }}
                                    >
                                        {item.name}
                                    </Text>
                                    <TouchableOpacity
                                        onPress={() =>
                                            setPrerequisiteEvents((prev) =>
                                                prev.filter((e) => e.id !== item.id),
                                            )
                                        }
                                    >
                                        <CrossIcon
                                            width={24}
                                            height={24}
                                            color={theme.FOREGROUND}
                                        />
                                    </TouchableOpacity>
                                </View>
                            )}
                        />
                    </View>
                    <TouchableOpacity
                        style={styles.button}
                        onPress={() => {
                            onClick(selectedEvent, prerequisiteEvents);
                            setToDefaults();
                        }}
                    >
                        <Text
                            style={{ color: '#FFF', fontFamily: 'AlbertSans', alignSelf: 'center' }}
                        >
                            Add Dependency Set
                        </Text>
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>
        </Modal>
    );
};

const styles = StyleSheet.create({
    card: {
        borderRadius: 12,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 0,
        },
        shadowOpacity: 0.1,
        shadowRadius: 24,
        marginVertical: 16,
        padding: 16,
    },
    subHeading: {
        fontSize: typography.headingSize,
        fontFamily: 'AlbertSans',
        marginBottom: 8,
    },
    input: {
        height: 40,
        borderRadius: 12,
        fontSize: typography.subHeadingSize,
        fontFamily: 'AlbertSans',
        paddingHorizontal: 16,
        paddingVertical: 8,
        backgroundColor: '#F0F0F0',
        justifyContent: 'center',
        marginBottom: 16,
    },
    button: {
        width: '92%',
        borderRadius: 12,
        backgroundColor: '#000',
        paddingVertical: 12,
        paddingHorizontal: 16,
        marginBottom: 8,
        alignSelf: 'center',
    },
    warning: {
        fontSize: typography.bodySize,
        fontFamily: 'AlbertSans',
        marginBottom: 12,
        color: '#FF0000',
        alignSelf: 'center',
    },
    chip: {
        height: 36,
        padding: 8,
        borderRadius: 4,
        marginRight: 8,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
});

export default AddDependencyModal;
