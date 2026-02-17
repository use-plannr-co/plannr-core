import React, { useRef, useImperativeHandle, forwardRef } from 'react';
import {
    Animated,
    Dimensions,
    PanResponder,
    View,
    Pressable,
    StyleSheet,
    ScrollView,
    Text,
    Image,
    TouchableOpacity,
} from 'react-native';
import { spacing } from '../design/spacing.js';
import { useAppState } from '../context/AppStateContext.js';
import { typography } from '../design/typography.js';

const SCREEN_HEIGHT = Dimensions.get('window').height;
const MAX_TRANSLATE_Y = SCREEN_HEIGHT * 0.6;

const SPACE =
    SCREEN_HEIGHT > 900
        ? spacing.SPACING_4
        : SCREEN_HEIGHT > 800
          ? spacing.SPACING_3
          : spacing.SPACING_2;

const WalkthroughBottomSheet = forwardRef(({ theme }, ref) => {
    const { appState, setAppState } = useAppState();
    const translateY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
    const backdropOpacity = useRef(new Animated.Value(0)).current;

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

                    {/* Planzo Image */}
                    <Image
                        source={require('../../assets/walkthrough/PlanzoPopUp.png')}
                        style={{
                            width: 240,
                            height: 300,
                            marginBottom: SPACE,
                            alignSelf: 'center',
                        }}
                    />

                    <Text
                        style={{
                            fontSize: typography.headingSize,
                            fontFamily: 'AlbertSans',
                            color: theme.FOREGROUND,
                            marginBottom: SPACE / 2,
                            alignSelf: 'center',
                        }}
                    >
                        You're ready to start planning!
                    </Text>
                </View>

                <TouchableOpacity
                    style={styles.button}
                    onPress={() => {
                        setAppState((prevState) => ({
                            ...prevState,
                            onboarded: true,
                        }));
                        hide();
                    }}
                >
                    <Text style={{ color: '#FFF', fontFamily: 'AlbertSans', alignSelf: 'center' }}>
                        Get Started
                    </Text>
                </TouchableOpacity>
            </Animated.View>
        </>
    );
});

const styles = StyleSheet.create({
    scheduleItem: {
        width: '100%',
        borderRadius: 12,
        paddingVertical: 16,
        paddingHorizontal: 16,
        marginBottom: SPACE,
        alignSelf: 'center',
    },
    button: {
        width: '100%',
        borderRadius: 12,
        backgroundColor: '#000',
        paddingVertical: 12,
        paddingHorizontal: 16,
        flexDirection: 'row',
        justifyContent: 'center',
        marginTop: SPACE,
        marginBottom: 8,
    },
});

export default WalkthroughBottomSheet;
