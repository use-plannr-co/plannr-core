import React, { useEffect, useState, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Dimensions,
} from 'react-native';
import { LineChart, BarChart } from 'react-native-gifted-charts';
import { Circle } from 'react-native-animated-spinkit';

import { useAppState } from '../context/AppStateContext.js';
import { useSubscription } from '../hooks/useSubscription.js';
import { useActionLogger } from '../hooks/useActionLogger.js';
import { useAnalyticsAPI } from '../api/hooks/useAnalyticsAPI.js';

import ProGate from '../components/ProGate.jsx';
import LoadingScreen from './LoadingScreen.jsx';
import { lightColor, darkColor } from '../design/colors.js';
import { spacing, padding } from '../design/spacing.js';
import { typography } from '../design/typography.js';
import convertDateToScheduleDate from '../utils/dateConversion.js';
import useCurrentTime from '../utils/useCurrentTime.js';

import GoBackIcon from '../../assets/system-icons/GoBackIcon.svg';
import RefreshIcon from '../../assets/system-icons/RefreshIcon.svg';

const { width, height } = Dimensions.get('window');
const CONTENT_WIDTH = width - padding.SCREEN_PADDING * 2;
const BAR_CHART_W = CONTENT_WIDTH - spacing.SPACING_8; // chart width prop (card inner minus Y-axis reservation)
const BAR_GAP = 8;
const BAR_W = Math.floor((BAR_CHART_W - 6 * BAR_GAP) / 7); // fills all 7 bars edge-to-edge
const SPACE = height > 900 ? spacing.SPACING_4 : height > 800 ? spacing.SPACING_3 : spacing.SPACING_2;

const PERIODS = ['7 Days', '30 Days', 'All Time'];
const DOW_ORDER = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const DOW_SHORT = { Monday: 'Mon', Tuesday: 'Tue', Wednesday: 'Wed', Thursday: 'Thu', Friday: 'Fri', Saturday: 'Sat', Sunday: 'Sun' };
const HOUR_BUCKETS = [
    { label: 'Before 9', hours: [0, 1, 2, 3, 4, 5, 6, 7, 8] },
    { label: '9-12', hours: [9, 10, 11] },
    { label: '12-3', hours: [12, 13, 14] },
    { label: '3-6', hours: [15, 16, 17] },
    { label: '6-9', hours: [18, 19, 20] },
    { label: 'After 9', hours: [21, 22, 23] },
];
const MOOD_EMOJIS = ['😴', '😐', '🙂', '😄', '🚀'];
const CATEGORY_LABELS = {
    WORK: 'Work',
    MEETING: 'Meeting',
    PERSONAL: 'Personal',
    EDUCATION: 'Education',
    TRAVEL: 'Travel',
    RECREATIONAL: 'Recreational',
    ERRAND: 'Errand',
    EVENT: 'Event',
    OTHER: 'Other',
    UNCATEGORIZED: 'Uncategorized',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatPct(rate) {
    return `${Math.round((rate || 0) * 100)}%`;
}

function filterDailyData(dailyData, period) {
    if (!dailyData || dailyData.length === 0) return [];
    if (period === 'All Time') return dailyData;
    const days = period === '7 Days' ? 7 : 30;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    const cutoffStr = cutoff.toISOString().slice(0, 10);
    return dailyData.filter((d) => d.date >= cutoffStr);
}

function formatDateShort(dateStr) {
    const d = new Date(dateStr + 'T00:00:00Z');
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
}

function buildLineChartData(filteredDaily, theme) {
    if (!filteredDaily || filteredDaily.length === 0) return [];
    return filteredDaily.map((d) => ({
        value: Math.round((d.completed / Math.max(d.total, 1)) * 100),
        dataPointColor: theme.GRADIENT_START,
    }));
}

function buildXLabels(filteredDaily, period) {
    if (!filteredDaily || filteredDaily.length === 0) return [];
    const n = filteredDaily.length;
    const step = period === '7 Days' ? 2 : period === '30 Days' ? 6 : 15;
    return filteredDaily.map((d, i) =>
        i === 0 || i === n - 1 || i % step === 0 ? formatDateShort(d.date) : ''
    );
}

function buildBarChartData(dowStats, theme) {
    return DOW_ORDER.map((day) => ({
        value: Math.round(((dowStats[day]?.rate) || 0) * 100),
        label: DOW_SHORT[day],
        frontColor: theme.GRADIENT_START,
    }));
}

function computeHourlyBuckets(hourlyStats) {
    return HOUR_BUCKETS.map((bucket) => {
        let total = 0;
        let completed = 0;
        for (const h of bucket.hours) {
            const s = hourlyStats[h];
            if (s) {
                total += s.total;
                completed += s.completed;
            }
        }
        const rate = total > 0 ? completed / total : 0;
        return { label: bucket.label, total, completed, rate };
    });
}

function getTodayCheckin(moodData) {
    const today = new Date().toISOString().slice(0, 10);
    return moodData?.find((m) => m.date === today) || null;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

const SectionTitle = ({ label, description, theme }) => (
    <View style={{ marginBottom: spacing.SPACING_4 }}>
        <Text style={[styles.sectionTitle, { color: theme.FOREGROUND }]}>{label}</Text>
        {description && (
            <Text style={[styles.sectionDescription, { color: theme.FOREGROUND }]}>
                {description}
            </Text>
        )}
    </View>
);

const StatCard = ({ label, value, theme }) => (
    <View style={[styles.statCard, { backgroundColor: theme.COMP_COLOR }]}>
        <Text style={[styles.statValue, { color: theme.FOREGROUND }]}>{value}</Text>
        <Text style={[styles.statLabel, { color: theme.FOREGROUND, opacity: 0.6 }]}>{label}</Text>
    </View>
);

const PeriodTabs = ({ selected, onSelect, theme }) => (
    <View style={styles.periodRow}>
        {PERIODS.map((p) => (
            <TouchableOpacity
                key={p}
                onPress={() => onSelect(p)}
                style={[
                    styles.periodTab,
                    {
                        backgroundColor:
                            selected === p ? theme.GRADIENT_START : theme.COMP_COLOR,
                    },
                ]}
            >
                <Text
                    style={[
                        styles.periodTabText,
                        { color: selected === p ? '#FFFFFF' : theme.FOREGROUND },
                    ]}
                >
                    {p}
                </Text>
            </TouchableOpacity>
        ))}
    </View>
);

const HeatmapBucket = ({ bucket, theme }) => {
    const opacity = 0.15 + bucket.rate * 0.85;
    return (
        <View style={styles.heatmapBucketWrapper}>
            <View
                style={[
                    styles.heatmapBucket,
                    {
                        backgroundColor: theme.GRADIENT_START,
                        opacity: bucket.total === 0 ? 0.1 : opacity,
                    },
                ]}
            />
            <Text style={[styles.heatmapLabel, { color: theme.FOREGROUND }]}>{bucket.label}</Text>
            {bucket.total > 0 && (
                <Text style={[styles.heatmapPct, { color: theme.FOREGROUND, opacity: 0.6 }]}>
                    {formatPct(bucket.rate)}
                </Text>
            )}
        </View>
    );
};

const CategoryBar = ({ name, stats, theme }) => {
    const rate = stats.rate || 0;
    const label = CATEGORY_LABELS[name] || name;
    return (
        <View style={styles.categoryRow}>
            <Text style={[styles.categoryLabel, { color: theme.FOREGROUND }]}>{label}</Text>
            <View style={[styles.categoryBarBg, { backgroundColor: theme.INPUT }]}>
                <View
                    style={[
                        styles.categoryBarFill,
                        {
                            width: `${Math.round(rate * 100)}%`,
                            backgroundColor: theme.GRADIENT_START,
                        },
                    ]}
                />
            </View>
            <Text style={[styles.categoryPct, { color: theme.FOREGROUND, opacity: 0.7 }]}>
                {formatPct(rate)}
            </Text>
        </View>
    );
};

const MoodCheckin = ({ moodData, onSubmit, theme }) => {
    const todayCheckin = getTodayCheckin(moodData);
    const [selected, setSelected] = useState(todayCheckin ? todayCheckin.rating - 1 : null);
    const [submitting, setSubmitting] = useState(false);

    const handleSelect = async (idx) => {
        if (submitting) return;
        setSelected(idx);
        setSubmitting(true);
        await onSubmit(idx + 1);
        setSubmitting(false);
    };

    return (
        <View style={[styles.moodCard, { backgroundColor: theme.COMP_COLOR }]}>
            <Text style={[styles.moodTitle, { color: theme.FOREGROUND }]}>
                {selected !== null ? "Today's vibe logged " : "How was today's productivity?"}
            </Text>
            <View style={styles.moodRow}>
                {MOOD_EMOJIS.map((emoji, idx) => (
                    <TouchableOpacity
                        key={idx}
                        onPress={() => handleSelect(idx)}
                        style={[
                            styles.moodButton,
                            selected === idx && {
                                backgroundColor: theme.GRADIENT_START,
                                opacity: 1,
                            },
                        ]}
                    >
                        <Text style={styles.moodEmoji}>{emoji}</Text>
                    </TouchableOpacity>
                ))}
            </View>
        </View>
    );
};

const EmptyState = ({ theme }) => (
    <View style={[styles.emptyCard, { backgroundColor: theme.COMP_COLOR }]}>
        <Text style={[styles.emptyTitle, { color: theme.FOREGROUND }]}>
            Insights are building...
        </Text>
        <Text style={[styles.emptyBody, { color: theme.FOREGROUND, opacity: 0.6 }]}>
            Keep scheduling and completing tasks. Your productivity patterns will appear here after a few days of data.
        </Text>
    </View>
);

// ─── Main Screen ──────────────────────────────────────────────────────────────

const ProductivityAnalyticsScreen = ({ navigation }) => {
    const { appState, storageLoaded } = useAppState();
    const { isPro, isLoading: subscriptionLoading } = useSubscription();
    const { logScreenView } = useActionLogger('ProductivityAnalytics');
    const currentTime = useCurrentTime();
    const { getAnalytics, submitMoodCheckin } = useAnalyticsAPI();

    const [analyticsData, setAnalyticsData] = useState(null);
    const [moodData, setMoodData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [period, setPeriod] = useState('30 Days');

    useEffect(() => {
        logScreenView({ isPro });
    }, [isPro]);

    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        getAnalytics()
            .then((res) => {
                if (!cancelled && res?.data) {
                    setAnalyticsData(res.data.analytics);
                    setMoodData(res.data.mood || []);
                }
            })
            .catch(() => {})
            .finally(() => {
                if (!cancelled) setLoading(false);
            });
        return () => {
            cancelled = true;
        };
    }, []);

    const handleRefresh = useCallback(() => {
        setLoading(true);
        getAnalytics()
            .then((res) => {
                if (res?.data) {
                    setAnalyticsData(res.data.analytics);
                    setMoodData(res.data.mood || []);
                }
            })
            .catch(() => {})
            .finally(() => setLoading(false));
    }, [getAnalytics]);

    const handleMoodSubmit = useCallback(
        async (rating) => {
            const today = new Date().toISOString().slice(0, 10);
            await submitMoodCheckin(today, rating);
            setMoodData((prev) => {
                const filtered = prev.filter((m) => m.date !== today);
                return [{ date: today, rating }, ...filtered];
            });
        },
        [submitMoodCheckin]
    );

    if (!storageLoaded) return <LoadingScreen />;

    const theme = appState.userPreferences.theme === 'light' ? lightColor : darkColor;
    const hasData = analyticsData && analyticsData.summary.daysWithData >= 3;

    const filteredDaily = filterDailyData(analyticsData?.dailyData, period);
    const lineData = buildLineChartData(filteredDaily, theme);
    const xLabels = buildXLabels(filteredDaily, period);
    // Compute spacing so all points fit within the chart width without scrolling.
    // Available drawing area = chartWidth - yAxisLabelWidth (36).
    const lineChartW = CONTENT_WIDTH - spacing.SPACING_16 - 4;
    const lineSpacing = 36;
    const barData = buildBarChartData(analyticsData?.dowStats || {}, theme);
    const heatmapBuckets = computeHourlyBuckets(analyticsData?.hourlyStats || {});
    const categoryEntries = Object.entries(analyticsData?.categoryStats || {})
        .filter(([, s]) => s.total >= 2)
        .sort((a, b) => b[1].totalMinutes - a[1].totalMinutes)
        .slice(0, 6);

    const summary = analyticsData?.summary || {};

    return (
        // <ProGate navigation={navigation} featureKey="productivity_analytics">
            <View style={[styles.container, { backgroundColor: theme.BACKGROUND }]}>
                {/* Header */}
                <View style={styles.header}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                            <GoBackIcon width={24} height={24} color={theme.FOREGROUND} />
                        </TouchableOpacity>
                        <Text style={[styles.title, { color: theme.FOREGROUND }]}>
                            Productivity
                        </Text>
                    </View>
                    <TouchableOpacity
                        onPress={handleRefresh}
                        disabled={loading}
                        style={{ opacity: loading ? 0.4 : 1 }}
                    >
                        <RefreshIcon width={24} height={24} color={theme.FOREGROUND} />
                    </TouchableOpacity>
                </View>

                {loading ? (
                    <View style={styles.loadingContainer}>
                        <Circle size={60} color={theme.FOREGROUND} />
                        <Text style={[styles.loadingText, { color: theme.FOREGROUND, opacity: 0.6 }]}>
                            Computing your insights...
                        </Text>
                    </View>
                ) : (
                    <ScrollView
                        style={styles.scroll}
                        contentContainerStyle={styles.scrollContent}
                        showsVerticalScrollIndicator={false}
                    >
                        {/* Mood check-in (always visible) */}
                        <MoodCheckin
                            moodData={moodData}
                            onSubmit={handleMoodSubmit}
                            theme={theme}
                        />

                        {!hasData ? (
                            <EmptyState theme={theme} />
                        ) : (
                            <>
                                {/* Summary stat cards */}
                                <View style={styles.statRow}>
                                    <StatCard
                                        label="Completion"
                                        value={formatPct(summary.overallCompletionRate)}
                                        theme={theme}
                                    />
                                    <StatCard
                                        label="Streak"
                                        value={`${summary.currentStreak}d`}
                                        theme={theme}
                                    />
                                    <StatCard
                                        label="Focus"
                                        value={`${summary.totalFocusHours}h`}
                                        theme={theme}
                                    />
                                </View>

                                {/* Period tabs */}
                                <PeriodTabs selected={period} onSelect={setPeriod} theme={theme} />

                                {/* Completion trend */}
                                {lineData.length > 1 && (
                                    <View style={[styles.card, { backgroundColor: theme.COMP_COLOR }]}>
                                        <SectionTitle label="Completion Trend" description="% of tasks completed each day over the selected period" theme={theme} />
                                        <LineChart
                                            data={lineData}
                                            width={CONTENT_WIDTH - spacing.SPACING_16 - 4}
                                            height={120}
                                            color={theme.GRADIENT_START}
                                            thickness={2}
                                            startFillColor={theme.GRADIENT_START}
                                            endFillColor={theme.BACKGROUND}
                                            startOpacity={0.3}
                                            endOpacity={0.01}
                                            areaChart
                                            hideDataPoints={lineData.length > 14}
                                            hideRules
                                            hideAxesAndRules={false}
                                            xAxisColor={theme.INPUT}
                                            yAxisColor={theme.INPUT}
                                            maxValue={100}
                                            noOfSections={2}
                                            yAxisLabelWidth={36}
                                            formatYLabel={(v) => `${v}%`}
                                            yAxisTextStyle={{ color: theme.FOREGROUND, fontSize: 10, opacity: 0.5 }}
                                            xAxisLabelTexts={xLabels}
                                            xAxisLabelTextStyle={{ color: theme.FOREGROUND, fontSize: 8, opacity: 0.5 }}
                                            showFractionalValues={false}
                                            spacing={lineSpacing}
                                            initialSpacing={0}
                                            endSpacing={0}
                                        />
                                        <Text style={[styles.sectionDescription, { color: theme.FOREGROUND, opacity: 0.6, textAlign: 'center' }]}>Scroll sideways to see full chart.</Text>
                                    </View>
                                )}

                                {/* Best days */}
                                <View style={[styles.card, { backgroundColor: theme.COMP_COLOR }]}>
                                    <SectionTitle label="Best Days of the Week" description="Which days you're most likely to finish what you planned" theme={theme} />
                                    <BarChart
                                        data={barData}
                                        width={BAR_CHART_W}
                                        height={120}
                                        barWidth={BAR_W}
                                        spacing={BAR_GAP}
                                        maxValue={100}
                                        noOfSections={2}
                                        hideRules
                                        hideYAxisText
                                        yAxisLabelWidth={0}
                                        xAxisColor={theme.INPUT}
                                        yAxisColor="transparent"
                                        xAxisLabelTextStyle={{
                                            color: theme.FOREGROUND,
                                            fontSize: 9,
                                            opacity: 0.6,
                                        }}
                                        frontColor={theme.GRADIENT_START}
                                        roundedTop
                                        initialSpacing={0}
                                        endSpacing={0}
                                    />
                                </View>

                                {/* Peak hours heatmap */}
                                <View style={[styles.card, { backgroundColor: theme.COMP_COLOR }]}>
                                    <SectionTitle label="Peak Hours" description="When your completed tasks tend to be scheduled" theme={theme} />
                                    <View style={styles.heatmapRow}>
                                        {heatmapBuckets.map((bucket) => (
                                            <HeatmapBucket
                                                key={bucket.label}
                                                bucket={bucket}
                                                theme={theme}
                                            />
                                        ))}
                                    </View>
                                </View>

                                {/* Task breakdown */}
                                {categoryEntries.length > 0 && (
                                    <View style={[styles.card, { backgroundColor: theme.COMP_COLOR }]}>
                                        <SectionTitle label="Task Breakdown" description="Completion rate by task category" theme={theme} />
                                        {categoryEntries.map(([name, stats]) => (
                                            <CategoryBar
                                                key={name}
                                                name={name}
                                                stats={stats}
                                                theme={theme}
                                            />
                                        ))}
                                    </View>
                                )}

                                {/* Additional stats footer */}
                                <View style={[styles.card, { backgroundColor: theme.COMP_COLOR }]}>
                                    <SectionTitle label="All-Time Stats" description="Your overall productivity numbers since day one" theme={theme} />
                                    <View style={styles.footerRow}>
                                        <View style={styles.footerItem}>
                                            <Text style={[styles.footerValue, { color: theme.FOREGROUND }]}>
                                                {summary.completedBlocks}
                                            </Text>
                                            <Text style={[styles.footerLabel, { color: theme.FOREGROUND, opacity: 0.6 }]}>
                                                Tasks done
                                            </Text>
                                        </View>
                                        <View style={styles.footerItem}>
                                            <Text style={[styles.footerValue, { color: theme.FOREGROUND }]}>
                                                {summary.longestStreak}d
                                            </Text>
                                            <Text style={[styles.footerLabel, { color: theme.FOREGROUND, opacity: 0.6 }]}>
                                                Best streak
                                            </Text>
                                        </View>
                                        <View style={styles.footerItem}>
                                            <Text style={[styles.footerValue, { color: theme.FOREGROUND }]}>
                                                {summary.totalScheduledHours}h
                                            </Text>
                                            <Text style={[styles.footerLabel, { color: theme.FOREGROUND, opacity: 0.6 }]}>
                                                Scheduled
                                            </Text>
                                        </View>
                                    </View>
                                </View>
                            </>
                        )}
                        <View style={{ height: spacing.SPACING_10 }} />
                    </ScrollView>
                )}
            </View>
        // </ProGate>
    );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    container: {
        flex: 1,
        paddingTop: padding.SCREEN_PADDING,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: spacing.SPACING_16,
        marginLeft: padding.SCREEN_PADDING,
        marginRight: padding.SCREEN_PADDING,
        marginBottom: 16,
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    backButton: {
        padding: spacing.SPACING_2,
        marginLeft: -spacing.SPACING_2,
    },
    title: {
        fontSize: typography.titleSize,
        fontFamily: 'PinkSunset',
        marginLeft: padding.SCREEN_PADDING,
    },
    loadingContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.SPACING_4,
    },
    loadingText: {
        fontFamily: 'AlbertSans',
        fontSize: typography.bodySize,
    },
    scroll: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: padding.SCREEN_PADDING,
        gap: SPACE,
    },
    // Stat cards
    statRow: {
        flexDirection: 'row',
        gap: spacing.SPACING_2,
    },
    statCard: {
        flex: 1,
        borderRadius: 12,
        padding: spacing.SPACING_4,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.08,
        shadowRadius: 6,
    },
    statValue: {
        fontFamily: 'PinkSunset',
        fontSize: typography.headingSize + 2,
        marginBottom: 2,
    },
    statLabel: {
        fontFamily: 'AlbertSans',
        fontSize: typography.bodySize,
        textAlign: 'center',
    },
    // Period tabs
    periodRow: {
        flexDirection: 'row',
        gap: spacing.SPACING_2,
    },
    periodTab: {
        flex: 1,
        paddingVertical: spacing.SPACING_2,
        borderRadius: 8,
        alignItems: 'center',
    },
    periodTabText: {
        fontFamily: 'AlbertSans',
        fontSize: typography.bodySize,
    },
    // Section cards
    card: {
        borderRadius: 12,
        padding: spacing.SPACING_4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.08,
        shadowRadius: 6,
    },
    sectionTitle: {
        fontFamily: 'AlbertSans',
        fontSize: typography.subHeadingSize,
        fontWeight: '600',
        marginBottom: spacing.SPACING_1,
    },
    sectionDescription: {
        fontFamily: 'AlbertSans',
        fontSize: typography.bodySize,
        opacity: 0.5,
    },
    // Heatmap
    heatmapRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    heatmapBucketWrapper: {
        alignItems: 'center',
        gap: 4,
        flex: 1,
    },
    heatmapBucket: {
        width: '85%',
        aspectRatio: 0.75,
        borderRadius: 6,
    },
    heatmapLabel: {
        fontFamily: 'AlbertSans',
        fontSize: 9,
        textAlign: 'center',
        opacity: 0.7,
    },
    heatmapPct: {
        fontFamily: 'AlbertSans',
        fontSize: 8,
        textAlign: 'center',
    },
    // Category bars
    categoryRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: spacing.SPACING_3,
        gap: spacing.SPACING_2,
    },
    categoryLabel: {
        fontFamily: 'AlbertSans',
        fontSize: typography.bodySize,
        width: 90,
    },
    categoryBarBg: {
        flex: 1,
        height: 8,
        borderRadius: 4,
        overflow: 'hidden',
    },
    categoryBarFill: {
        height: '100%',
        borderRadius: 4,
        minWidth: 4,
    },
    categoryPct: {
        fontFamily: 'AlbertSans',
        fontSize: typography.bodySize,
        width: 36,
        textAlign: 'right',
    },
    // Mood
    moodCard: {
        borderRadius: 12,
        padding: spacing.SPACING_4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.08,
        shadowRadius: 6,
    },
    moodTitle: {
        fontFamily: 'AlbertSans',
        fontSize: typography.subHeadingSize,
        fontWeight: '600',
        marginBottom: spacing.SPACING_4,
    },
    moodRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    moodButton: {
        width: 48,
        height: 48,
        borderRadius: 24,
        alignItems: 'center',
        justifyContent: 'center',
        opacity: 0.5,
    },
    moodEmoji: {
        fontSize: 26,
    },
    // Footer stats
    footerRow: {
        flexDirection: 'row',
        justifyContent: 'space-around',
    },
    footerItem: {
        alignItems: 'center',
        gap: 2,
    },
    footerValue: {
        fontFamily: 'PinkSunset',
        fontSize: typography.headingSize,
    },
    footerLabel: {
        fontFamily: 'AlbertSans',
        fontSize: typography.bodySize,
    },
    // Empty state
    emptyCard: {
        borderRadius: 12,
        padding: spacing.SPACING_6,
        alignItems: 'center',
        gap: spacing.SPACING_3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.08,
        shadowRadius: 6,
    },
    emptyTitle: {
        fontFamily: 'AlbertSans',
        fontSize: typography.subHeadingSize,
        fontWeight: '600',
        textAlign: 'center',
    },
    emptyBody: {
        fontFamily: 'AlbertSans',
        fontSize: typography.bodySize,
        textAlign: 'center',
        lineHeight: 20,
    },
});

export default ProductivityAnalyticsScreen;
