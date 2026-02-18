import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList } from 'react-native';
import Checkbox from './Checkbox';
import DropDownIcon from '../../assets/system-icons/DropDownIcon.svg';
import { useAppState } from '../context/AppStateContext.js';
import { lightColor, darkColor } from '../design/colors.js';
import { typography } from '../design/typography.js';

const MultiSelect = ({ currentSelected, items, selectedItems, onSelect }) => {
    const { appState } = useAppState();
    const theme = appState.userPreferences.theme === 'light' ? lightColor : darkColor;

    const [checkedItems, setCheckedItems] = useState([]);
    const [showOptions, setShowOptions] = useState(false);

    return (
        <View>
            <View
                style={{ ...styles.input, backgroundColor: theme.INPUT, color: theme.FOREGROUND }}
            >
                <Text style={{ fontFamily: 'AlbertSans', fontSize: 16, color: theme.FOREGROUND }}>
                    Select prerequisites
                </Text>
                <TouchableOpacity onPress={() => setShowOptions(!showOptions)}>
                    <DropDownIcon width={24} height={24} color={theme.FOREGROUND} />
                </TouchableOpacity>
            </View>
            {showOptions && (
                <FlatList
                    data={items.filter((item) => item.id !== currentSelected?.id)}
                    keyExtractor={(item) => item.id}
                    renderItem={({ item }) => {
                        const isChecked = selectedItems.some((i) => i.id === item.id);
                        return (
                            <View
                                style={{
                                    padding: 8,
                                    borderBottomWidth: 1,
                                    borderColor: theme.FOREGROUND + '1A',
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                }}
                            >
                                <Text
                                    style={{
                                        fontFamily: 'AlbertSans',
                                        fontSize: 16,
                                        color: theme.FOREGROUND,
                                    }}
                                >
                                    {item.name}
                                </Text>
                                <Checkbox
                                    onChange={() => {
                                        const updated = isChecked
                                            ? selectedItems.filter((i) => i.id !== item.id)
                                            : [...selectedItems, item];
                                        onSelect(updated);
                                    }}
                                    checked={checkedItems.includes(item)}
                                    needAbsolute={false}
                                />
                            </View>
                        );
                    }}
                    style={{ maxHeight: 200, borderRadius: 12, marginTop: 8 }}
                />
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    input: {
        width: 300,
        height: 40,
        borderRadius: 12,
        fontSize: typography.subHeadingSize,
        fontFamily: 'AlbertSans',
        paddingHorizontal: 16,
        paddingVertical: 8,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
});

export default MultiSelect;
