import React, { useRef, useImperativeHandle, forwardRef } from 'react';
import {
    Animated,
    Dimensions,
    PanResponder,
    View,
    Pressable,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Text,
} from 'react-native';
import { spacing } from '../design/spacing.js';
import { useAppState } from '../context/AppStateContext.js';
import { useNavigation } from '@react-navigation/native';
import { typography } from '../design/typography.js';
import RightArrowIcon from '../../assets/system-icons/RightArrowIcon.svg';

const SCREEN_HEIGHT = Dimensions.get('window').height;
const MAX_TRANSLATE_Y = SCREEN_HEIGHT * 0.5;

const SPACE =
    SCREEN_HEIGHT > 900
        ? spacing.SPACING_4
        : SCREEN_HEIGHT > 800
          ? spacing.SPACING_3
          : spacing.SPACING_2;

const RescheduleBottomSheet = forwardRef(({ children, theme }, ref) => {
    const { appState } = useAppState();
    const translateY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
    const backdropOpacity = useRef(new Animated.Value(0)).current;
    const navigation = useNavigation();

    const panResponder = useRef(
        PanResponder.create({
            onMoveShouldSetPanResponder: (_, gestureState) => gestureState.dy > 10,
            onPanResponderMove: (_, gestureState) => {
                const newY = Math.max(0, gestureState.dy);
                translateY.setValue(newY);
            },
            onPanResponderRelease: (_, gestureState) => {
                if (gestureState.dy > 80) {
                    hide();
                } else {
                    Animated.spring(translateY, {
                        toValue: 0,
                        useNativeDriver: true,
                    }).start();
                }
            },
        }),
    ).current;

    const show = () => {
        Animated.parallel([
            Animated.spring(translateY, {
                toValue: 0,
                useNativeDriver: true,
            }),
            Animated.timing(backdropOpacity, {
                toValue: 1,
                duration: 300,
                useNativeDriver: true,
            }),
        ]).start();
    };

    const hide = () => {
        Animated.parallel([
            Animated.timing(translateY, {
                toValue: SCREEN_HEIGHT,
                duration: 300,
                useNativeDriver: true,
            }),
            Animated.timing(backdropOpacity, {
                toValue: 0,
                duration: 200,
                useNativeDriver: true,
            }),
        ]).start();
    };

    useImperativeHandle(ref, () => ({
        show,
        hide,
    }));

    return (
        <>
            <Animated.View
                style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: '#000000' + '99',
                    opacity: backdropOpacity,
                }}
            >
                <Pressable style={{ flex: 1 }} onPress={hide} />
            </Animated.View>

            <Animated.View
                style={{
                    position: 'absolute',
                    left: 0,
                    right: 0,
                    bottom: 0,
                    transform: [{ translateY }],
                    backgroundColor: theme.BACKGROUND,
                    borderTopLeftRadius: 20,
                    borderTopRightRadius: 20,
                    paddingBottom: 16,
                    paddingHorizontal: 16,
                    maxHeight: MAX_TRANSLATE_Y,
                }}
            >
                <View
                    {...panResponder.panHandlers}
                    style={{
                        width: '100%',
                        alignItems: 'center',
                        paddingVertical: 10,
                    }}
                >
                    <View
                        style={{
                            height: 8,
                            width: 40,
                            backgroundColor: theme.INPUT,
                            marginBottom: SPACE,
                            alignSelf: 'center',
                            borderRadius: 12,
                        }}
                    />
                    <Text
                        style={{
                            fontSize: typography.headingSize,
                            fontFamily: 'AlbertSans',
                            color: theme.FOREGROUND,
                            marginBottom: SPACE,
                            alignSelf: 'center',
                        }}
                    >
                        Pick a schedule to reschedule
                    </Text>
                </View>
                <ScrollView style={{ borderRadius: 12 }}>
                    {appState.savedSchedules.map((schedule) => (
                        <TouchableOpacity
                            key={schedule.name}
                            onPress={() => {
                                ref.current?.hide();
                                navigation.navigate('Reschedule', { schedule });
                            }}
                            style={{
                                ...styles.button,
                                backgroundColor: theme.INPUT,
                                flexDirection: 'row',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                            }}
                        >
                            <Text
                                style={{
                                    color: theme.FOREGROUND,
                                    fontSize: typography.subHeadingSize,
                                    fontFamily: 'AlbertSans',
                                }}
                            >
                                {schedule.name}
                            </Text>
                            <RightArrowIcon width={16} height={16} color={theme.FOREGROUND} />
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </Animated.View>
        </>
    );
});

const styles = StyleSheet.create({
    button: {
        width: '100%',
        borderRadius: 12,
        backgroundColor: '#000',
        paddingVertical: 16,
        paddingHorizontal: 16,
        marginBottom: SPACE,
        alignSelf: 'center',
    },
});

export default RescheduleBottomSheet;
