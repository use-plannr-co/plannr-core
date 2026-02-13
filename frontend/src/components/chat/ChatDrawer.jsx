import React, { useRef, useEffect } from 'react';
import {
    View, Text, FlatList, TouchableOpacity, Animated,
    Dimensions, StyleSheet, PanResponder,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Line, Path } from 'react-native-svg';
import { lightColor, darkColor } from '../../design/colors.js';
import { useAppState } from '../../context/AppStateContext.js';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const DRAWER_WIDTH = Math.round(SCREEN_WIDTH * 0.78);

function CloseIcon({ color }) {
    return (
        <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
            <Line x1="18" y1="6" x2="6" y2="18" stroke={color} strokeWidth={2} strokeLinecap="round" />
            <Line x1="6" y1="6" x2="18" y2="18" stroke={color} strokeWidth={2} strokeLinecap="round" />
        </Svg>
    );
}

function formatDate(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.floor((now - d) / 86400000);
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function ChatDrawer({ isOpen, onClose, chats, activeChat, onSelectChat, onNewChat, onDeleteChat }) {
    const insets = useSafeAreaInsets();
    const { appState } = useAppState();
    const theme = appState.userPreferences.theme === 'light' ? lightColor : darkColor;
    const isDark = appState.userPreferences.theme !== 'light';

    const translateX = useRef(new Animated.Value(-DRAWER_WIDTH)).current;

    useEffect(() => {
        Animated.spring(translateX, {
            toValue: isOpen ? 0 : -DRAWER_WIDTH,
            useNativeDriver: true,
            bounciness: 0,
            speed: 20,
        }).start();
    }, [isOpen, translateX]);

    const panResponder = useRef(PanResponder.create({
        onMoveShouldSetPanResponder: (_, gs) => gs.dx < -10 && Math.abs(gs.dy) < 30,
        onPanResponderMove: (_, gs) => {
            if (gs.dx < 0) translateX.setValue(Math.max(-DRAWER_WIDTH, gs.dx));
        },
        onPanResponderRelease: (_, gs) => {
            if (gs.dx < -DRAWER_WIDTH * 0.35) {
                onClose();
            } else {
                Animated.spring(translateX, {
                    toValue: 0, useNativeDriver: true, bounciness: 0,
                }).start();
            }
        },
    })).current;

    if (!isOpen && translateX.__getValue() === -DRAWER_WIDTH) return null;

    return (
        <View style={StyleSheet.absoluteFill} pointerEvents={isOpen ? 'auto' : 'none'}>
            {/* Backdrop */}
            {/* <TouchableOpacity
                style={styles.backdrop}
                activeOpacity={1}
                onPress={onClose}
            /> */}

            {/* Drawer panel */}
            <Animated.View
                style={[
                    styles.drawer,
                    {
                        width: DRAWER_WIDTH,
                        backgroundColor: theme.COMP_COLOR,
                        paddingTop: insets.top + 12,
                        paddingBottom: insets.bottom + 12,
                        transform: [{ translateX }],
                    },
                ]}
                {...panResponder.panHandlers}
            >
                {/* Drawer header */}
                <View style={styles.drawerHeader}>
                    <Text style={[styles.drawerTitle, { color: theme.FOREGROUND }]}>Plannr AI</Text>
                    <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                        <CloseIcon color={theme.FOREGROUND} />
                    </TouchableOpacity>
                </View>

                {/* New chat button */}
                <TouchableOpacity
                    style={[styles.newChatBtn, { backgroundColor: theme.BUTTON }]}
                    onPress={onNewChat}
                >
                    <Text style={[styles.newChatText, { color: theme.SELECTED_TEXT }]}>+ New Chat</Text>
                </TouchableOpacity>

                {/* Chat list */}
                <FlatList
                    data={chats}
                    keyExtractor={item => item.id}
                    style={styles.list}
                    contentContainerStyle={{ paddingBottom: 8 }}
                    renderItem={({ item }) => {
                        const isActive = activeChat?.id === item.id;
                        return (
                            <TouchableOpacity
                                style={[
                                    styles.chatRow,
                                    isActive && { backgroundColor: isDark ? '#333' : '#EFEFEF' },
                                ]}
                                onPress={() => onSelectChat(item.id)}
                                onLongPress={() => onDeleteChat(item.id)}
                            >
                                <View style={styles.chatRowInner}>
                                    <Text
                                        style={[styles.chatTitle, { color: theme.FOREGROUND }]}
                                        numberOfLines={1}
                                    >
                                        {item.title || 'New chat'}
                                    </Text>
                                    <Text style={[styles.chatDate, { color: isDark ? '#666' : '#999' }]}>
                                        {formatDate(item.updatedAt)}
                                    </Text>
                                </View>
                            </TouchableOpacity>
                        );
                    }}
                    ListEmptyComponent={
                        <Text style={[styles.emptyText, { color: isDark ? '#555' : '#AAA' }]}>
                            No past chats
                        </Text>
                    }
                />
            </Animated.View>
        </View>
    );
}

const styles = StyleSheet.create({
    backdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.4)',
    },
    drawer: {
        position: 'absolute',
        top: 0,
        bottom: 0,
        left: 0,
        shadowColor: '#000',
        shadowOffset: { width: 4, height: 0 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 16,
    },
    drawerHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        marginBottom: 12,
    },
    drawerTitle: {
        fontSize: 18,
        fontWeight: '700',
    },
    newChatBtn: {
        marginHorizontal: 16,
        borderRadius: 10,
        paddingVertical: 10,
        alignItems: 'center',
        marginBottom: 12,
    },
    newChatText: {
        fontSize: 15,
        fontWeight: '600',
    },
    list: {
        flex: 1,
        paddingHorizontal: 8,
    },
    chatRow: {
        borderRadius: 8,
        paddingHorizontal: 8,
        paddingVertical: 10,
        marginBottom: 2,
    },
    chatRowInner: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 8,
    },
    chatTitle: {
        flex: 1,
        fontSize: 14,
        fontWeight: '500',
    },
    chatDate: {
        fontSize: 12,
        flexShrink: 0,
    },
    emptyText: {
        textAlign: 'center',
        marginTop: 32,
        fontSize: 14,
    },
});
