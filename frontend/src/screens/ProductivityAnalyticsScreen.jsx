import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions } from 'react-native';

import { useAppState } from '../context/AppStateContext.js';
import { useSubscription } from '../hooks/useSubscription.js';
import { useActionLogger } from '../hooks/useActionLogger.js';

import ProGate from '../components/ProGate.jsx';
import LoadingScreen from './LoadingScreen.jsx';
import { lightColor, darkColor } from '../design/colors.js';
import { spacing, padding } from '../design/spacing.js';
import { typography } from '../design/typography.js';
import convertDateToScheduleDate from '../utils/dateConversion.js';
import useCurrentTime from '../utils/useCurrentTime.js';

import GoBackIcon from '../../assets/system-icons/GoBackIcon.svg';

const { width, height } = Dimensions.get('window');
const SPACE = (height > 900) ? spacing.SPACING_4 : (height > 800) ? spacing.SPACING_3 : spacing.SPACING_2;

const ProductivityAnalyticsScreen = ({ navigation }) => {
    const { appState, storageLoaded } = useAppState();
    const { isPro, isLoading: subscriptionLoading } = useSubscription();
    const { logScreenView } = useActionLogger('ProductivityAnalytics');
    const currentTime = useCurrentTime();

    React.useEffect(() => {
        logScreenView({ isPro });
    }, [isPro]);

    if (!storageLoaded) {
        return <LoadingScreen />;
    }

    const theme = appState.userPreferences.theme === 'light' ? lightColor : darkColor;
    const todaysDate = convertDateToScheduleDate(currentTime);

    return (
        <ProGate 
            navigation={navigation} 
            featureKey="productivity_analytics"
        >
            <View style={[styles.container, { backgroundColor: theme.BACKGROUND }]}>
                {/* Header with back button */}
                <View style={styles.header}>
                    <TouchableOpacity 
                        onPress={() => navigation.goBack()}
                        style={styles.backButton}
                    >
                        <GoBackIcon width={24} height={24} color={theme.FOREGROUND} />
                    </TouchableOpacity>
                </View>

                {/* Title */}
                <Text style={[styles.title, { color: theme.FOREGROUND }]}>
                    Your Productivity Analytics
                </Text>

                {/* Scrollable Content */}
                <ScrollView style={styles.subContainer}>
                    <Text style={[styles.subHeading, { color: theme.FOREGROUND }]}>
                        Track your productivity trends and insights
                    </Text>

                    {/* Coming soon content placeholder */}
                    <View style={[styles.card, { backgroundColor: theme.COMP_COLOR }]}>
                        <Text style={[styles.cardText, { color: theme.FOREGROUND }]}>
                            Analytics features coming soon! 📊
                        </Text>
                    </View>
                </ScrollView>
            </View>
        </ProGate>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        paddingVertical: padding.SCREEN_PADDING,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: padding.SCREEN_PADDING,
        marginBottom: spacing.SPACING_4,
    },
    backButton: {
        padding: spacing.SPACING_2,
        marginLeft: -spacing.SPACING_2,
    },
    title: {
        fontSize: typography.titleSize,
        fontFamily: 'PinkSunset',
        marginBottom: SPACE,
        marginLeft: padding.SCREEN_PADDING,
    },
    subContainer: {
        width: width,
        alignSelf: 'center',
        paddingHorizontal: padding.SCREEN_PADDING,
    },
    subHeading: {
        fontSize: typography.subHeadingSize,
        fontFamily: 'AlbertSans',
        marginBottom: spacing.SPACING_6,
    },
    card: {
        width: '100%',
        borderRadius: 12,
        padding: spacing.SPACING_6,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 0,
        },
        shadowOpacity: 0.1,
        shadowRadius: 6,
    },
    cardText: {
        fontSize: typography.subHeadingSize,
        fontFamily: 'AlbertSans',
        textAlign: 'center',
    },
});

export default ProductivityAnalyticsScreen;