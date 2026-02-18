import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, Image } from 'react-native';
import Modal from 'react-native-modal';
import { SvgXml } from 'react-native-svg';

import { useAppState } from '../context/AppStateContext.js';
import { useActionLogger } from '../hooks/useActionLogger.js';

import { lightColor, darkColor } from '../design/colors.js';
import { spacing, padding } from '../design/spacing.js';
import { typography } from '../design/typography.js';

const { width, height } = Dimensions.get('window');
const SPACE =
    height > 900 ? spacing.SPACING_4 : height > 800 ? spacing.SPACING_3 : spacing.SPACING_2;

const FileAddIcon = `<svg width="120" height="120" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M14 2H6C4.89543 2 4 2.89543 4 4V20C4 21.1046 4.89543 22 6 22H18C19.1046 22 20 21.1046 20 20V8L14 2Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M14 2V8H20" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M12 18V12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M9 15H15" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;

const TodoImportScreen = ({ navigation }) => {
    const { appState } = useAppState();
    const { logAction, logScreenView } = useActionLogger('TodoImport');
    const theme = appState.userPreferences.theme === 'light' ? lightColor : darkColor;

    const [showImportModal, setShowImportModal] = useState(false);
    const [importing, setImporting] = useState(false);

    React.useEffect(() => {
        logScreenView();
    }, []);

    const importSources = [
        {
            id: 'todoist',
            name: 'Todoist',
            description: 'Import from your Todoist projects',
            icon: require('../../assets/import-icons/todoist.png'),
        },
        {
            id: 'google',
            name: 'Google Tasks',
            description: 'Sync with Google Tasks',
            icon: require('../../assets/import-icons/google-tasks.png'),
        },
        {
            id: 'microsoft',
            name: 'Microsoft To-Do',
            description: 'Import from Microsoft To-Do',
            icon: require('../../assets/import-icons/microsoft-todo.png'),
        },
        {
            id: 'notion',
            name: 'Notion',
            description: 'Import from Notion databases',
            icon: require('../../assets/import-icons/notion.png'),
        },
    ];

    const handleImportSource = (source) => {
        logAction('todo_import_source_selected', {
            sourceName: source.name,
            sourceId: source.id,
        });

        setImporting(true);
        setShowImportModal(false);
        console.log(`🚀 Starting import from ${source.name}`);

        // LAUNCH VERSION: Import functionality disabled for iOS submission
        // Will be enabled after launch with proper backend integration
        setTimeout(() => {
            setImporting(false);
            logAction('todo_import_completed', {
                sourceName: source.name,
                sourceId: source.id,
                isPlaceholder: true,
            });
            // For launch, just navigate to Center after "importing" placeholder
            navigation.navigate('Center');
        }, 1500);
    };

    const openImportModal = () => {
        logAction('todo_import_modal_opened');
        setShowImportModal(true);
    };

    const handleSkipImport = () => {
        logAction('todo_import_skipped');
        navigation.navigate('Center');
    };

    const ImportSourceItem = ({ source }) => (
        <TouchableOpacity
            style={[styles.importItem, { backgroundColor: theme.COMP_COLOR }]}
            onPress={() => handleImportSource(source)}
            disabled={importing}
        >
            <Image source={source.icon} style={styles.importIcon} />
            <View style={styles.importInfo}>
                <Text style={[styles.importName, { color: theme.FOREGROUND }]}>{source.name}</Text>
                <Text style={[styles.importDescription, { color: theme.FOREGROUND_SECONDARY }]}>
                    {source.description}
                </Text>
            </View>
        </TouchableOpacity>
    );

    return (
        <View style={[styles.container, { backgroundColor: theme.BACKGROUND }]}>
            {/* Header */}
            <Text style={[styles.title, { color: theme.FOREGROUND }]}>Import Tasks</Text>
            <Text style={[styles.subHeading, { color: theme.FOREGROUND_SECONDARY }]}>
                One click to get all your to-do's into Plannr!
            </Text>

            {/* Main Content Card */}
            <View style={[styles.mainCard, { backgroundColor: theme.COMP_COLOR }]}>
                <View style={styles.iconContainer}>
                    <SvgXml
                        xml={FileAddIcon}
                        width={120}
                        height={120}
                        color={theme.FOREGROUND_SECONDARY}
                    />
                </View>

                {/* Choose Import Button */}
                <TouchableOpacity
                    style={[styles.chooseButton, { opacity: importing ? 0.6 : 1 }]}
                    onPress={openImportModal}
                    disabled={importing}
                >
                    <Text style={styles.chooseButtonText}>
                        {importing ? 'Importing...' : 'Choose Your Import'}
                    </Text>
                </TouchableOpacity>
            </View>

            {/* Skip Option */}
            <TouchableOpacity style={styles.skipButton} onPress={handleSkipImport}>
                <Text style={[styles.skipText, { color: theme.FOREGROUND_SECONDARY }]}>
                    Skip and add tasks manually
                </Text>
            </TouchableOpacity>

            {/* Import Sources Modal */}
            <Modal
                isVisible={showImportModal}
                onBackdropPress={() => setShowImportModal(false)}
                onSwipeComplete={() => setShowImportModal(false)}
                swipeDirection="down"
                style={styles.modal}
            >
                <View style={[styles.modalContent, { backgroundColor: theme.BACKGROUND }]}>
                    {/* Modal Header */}
                    <View style={styles.modalHeader}>
                        <View
                            style={[
                                styles.modalHandle,
                                { backgroundColor: theme.FOREGROUND_SECONDARY },
                            ]}
                        />
                        <Text style={[styles.modalTitle, { color: theme.FOREGROUND }]}>
                            Choose Import Source
                        </Text>
                    </View>

                    {/* Import Sources List */}
                    <View style={styles.importList}>
                        {importSources.map((source) => (
                            <ImportSourceItem key={source.id} source={source} />
                        ))}
                    </View>
                </View>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        padding: padding.SCREEN_PADDING,
        height: '100%',
    },
    subContainer: {
        width: width,
        alignSelf: 'center',
        alignContent: 'center',
        paddingHorizontal: padding.SCREEN_PADDING,
    },
    title: {
        fontSize: typography.titleSize,
        fontFamily: 'PinkSunset',
        marginTop: spacing.SPACING_16,
        marginBottom: SPACE,
    },
    subHeading: {
        fontSize: typography.subHeadingSize,
        fontFamily: 'AlbertSans',
        marginBottom: SPACE,
    },
    mainCard: {
        flex: 1,
        borderRadius: 16,
        padding: spacing.SPACING_8,
        alignItems: 'center',
        justifyContent: 'center',
        marginVertical: spacing.SPACING_8,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
    },
    iconContainer: {
        marginBottom: spacing.SPACING_12,
    },
    chooseButton: {
        backgroundColor: '#000000',
        paddingVertical: spacing.SPACING_4,
        paddingHorizontal: spacing.SPACING_8,
        borderRadius: 12,
        width: '100%',
        alignItems: 'center',
    },
    chooseButtonText: {
        color: '#FFFFFF',
        fontSize: typography.subHeadingSize,
        fontFamily: 'AlbertSans',
        fontWeight: '600',
    },
    skipButton: {
        paddingVertical: spacing.SPACING_4,
        alignItems: 'center',
        marginBottom: spacing.SPACING_8,
    },
    skipText: {
        fontSize: typography.bodySize,
        fontFamily: 'AlbertSans',
        textDecorationLine: 'underline',
    },
    modal: {
        justifyContent: 'flex-end',
        margin: 0,
    },
    modalContent: {
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        paddingTop: spacing.SPACING_3,
        paddingBottom: spacing.SPACING_8 + 40,
        maxHeight: height * 0.8,
    },
    modalHeader: {
        alignItems: 'center',
        paddingBottom: spacing.SPACING_4,
        borderBottomWidth: 1,
        borderBottomColor: '#E5E5E5',
        marginBottom: spacing.SPACING_6,
    },
    modalHandle: {
        width: 36,
        height: 4,
        borderRadius: 2,
        marginBottom: spacing.SPACING_3,
    },
    modalTitle: {
        fontSize: typography.subHeadingSize,
        fontFamily: 'AlbertSans',
        fontWeight: '600',
    },
    importList: {
        paddingHorizontal: spacing.SPACING_4,
    },
    importItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: spacing.SPACING_4,
        borderRadius: 12,
        marginBottom: spacing.SPACING_3,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 1,
        },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    importIcon: {
        width: 40,
        height: 40,
        borderRadius: 8,
        marginRight: spacing.SPACING_4,
    },
    importInfo: {
        flex: 1,
    },
    importName: {
        fontSize: typography.subHeadingSize,
        fontFamily: 'AlbertSans',
        fontWeight: '600',
        marginBottom: 2,
    },
    importDescription: {
        fontSize: typography.bodySize - 1,
        fontFamily: 'AlbertSans',
        lineHeight: typography.bodySize * 1.2,
    },
});

export default TodoImportScreen;
