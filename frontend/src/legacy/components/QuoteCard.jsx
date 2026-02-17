import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAppState } from '../context/AppStateContext.js';
import { lightColor, darkColor } from '../design/colors.js';
import { typography } from '../design/typography.js';
import { spacing, padding } from '../design/spacing.js';
import { useQuote } from '../utils/useQuote.js';

const { width, height } = Dimensions.get('window');
const WIDTH = width - padding.SCREEN_PADDING * 2;
const SPACE =
    height > 900 ? spacing.SPACING_4 : height > 800 ? spacing.SPACING_3 : spacing.SPACING_2;

const QuoteCard = () => {
    const { appState } = useAppState();
    const theme = appState.userPreferences.theme === 'light' ? lightColor : darkColor;
    const { quote, author } = useQuote();

    return (
        <View style={styles.cardContainer}>
            <LinearGradient
                colors={[theme.GRADIENT_START, theme.GRADIENT_END]}
                start={[0, 0]}
                end={[1, 0]}
                style={styles.card}
            >
                <View style={styles.content}>
                    <Text style={styles.quoteText}>"{quote}"</Text>
                </View>
            </LinearGradient>
        </View>
    );
};

const styles = StyleSheet.create({
    cardContainer: {
        width: WIDTH,
        alignSelf: 'center',
        marginBottom: SPACE,
    },
    card: {
        borderRadius: 12,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 0,
        },
        shadowOpacity: 0.1,
        shadowRadius: 24,
        padding: 24,
        justifyContent: 'center',
        alignItems: 'center',
    },
    content: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    quoteText: {
        fontSize: typography.subHeadingSize,
        fontFamily: 'AlbertSans',
        fontStyle: 'italic',
        color: '#FFFFFF',
        textAlign: 'center',
        lineHeight: typography.subHeadingSize * 1.4,
    },
    authorText: {
        fontSize: typography.bodySize,
        fontFamily: 'AlbertSans',
        color: '#FFFFFF',
        opacity: 0.9,
        textAlign: 'center',
    },
});

export default QuoteCard;
