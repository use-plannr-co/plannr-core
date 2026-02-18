import { Dimensions } from 'react-native';

const { width } = Dimensions.get('window');

export const typography = {
    titleSize: width > 400 ? 32 : width > 350 ? 28 : 24,
    headingSize: width > 400 ? 20 : width > 350 ? 18 : 16,
    subHeadingSize: width > 400 ? 16 : width > 350 ? 14 : 12,
    bodySize: width > 400 ? 14 : width > 350 ? 12 : 10,
};
