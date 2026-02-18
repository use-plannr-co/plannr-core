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
    Image,
} from 'react-native';
import { spacing } from '../design/spacing.js';
import { typography } from '../design/typography.js';
import { getAvatarList } from '../utils/avatarUtils.js';

const SCREEN_HEIGHT = Dimensions.get('window').height;
const MAX_TRANSLATE_Y = SCREEN_HEIGHT * 0.6;

const SPACE =
    SCREEN_HEIGHT > 900
        ? spacing.SPACING_4
        : SCREEN_HEIGHT > 800
          ? spacing.SPACING_3
          : spacing.SPACING_2;

const AvatarPickerBottomSheet = forwardRef(({ theme, selectedAvatar, onAvatarSelect }, ref) => {
    const translateY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
    const backdropOpacity = useRef(new Animated.Value(0)).current;
    const avatarList = getAvatarList();

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

    const handleAvatarSelect = (avatarName) => {
        hide();
        if (onAvatarSelect) {
            onAvatarSelect(avatarName);
        }
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
                        Choose Your Avatar
                    </Text>
                </View>

                <ScrollView style={{ borderRadius: 12 }} showsVerticalScrollIndicator={false}>
                    <View style={styles.avatarGrid}>
                        {avatarList.map((avatar) => (
                            <TouchableOpacity
                                key={avatar.name}
                                style={[
                                    styles.avatarOption,
                                    { backgroundColor: theme.INPUT },
                                    selectedAvatar === avatar.name && {
                                        ...styles.selectedAvatarOption,
                                        borderColor: theme.SELECTION,
                                        backgroundColor: theme.SELECTION + '20',
                                    },
                                ]}
                                onPress={() => handleAvatarSelect(avatar.name)}
                            >
                                <Image
                                    source={avatar.image}
                                    style={styles.avatarImage}
                                    resizeMode="cover"
                                />
                                <Text style={{ ...styles.avatarText, color: theme.FOREGROUND }}>
                                    {avatar.displayName}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                    {/* Add some bottom padding for the last row */}
                    <View style={{ height: 20 }} />
                </ScrollView>
            </Animated.View>
        </>
    );
});

const styles = StyleSheet.create({
    avatarGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        paddingHorizontal: 8,
    },
    avatarOption: {
        width: '30%',
        aspectRatio: 1,
        marginBottom: 16,
        borderRadius: 16,
        padding: 12,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: 'transparent',
    },
    selectedAvatarOption: {
        borderWidth: 2,
    },
    avatarImage: {
        width: 50,
        height: 50,
        borderRadius: 25,
        marginBottom: 8,
    },
    avatarText: {
        fontSize: 12,
        fontFamily: 'AlbertSans',
        textAlign: 'center',
        fontWeight: '500',
    },
});

export default AvatarPickerBottomSheet;
