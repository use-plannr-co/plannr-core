// Avatar utility for managing preset avatar options
// These match the files in assets/avatars/

export const AVATAR_OPTIONS = {
    bear: {
        name: 'bear',
        displayName: 'Bear',
        image: require('../../assets/avatars/bear-avatar.png'),
    },
    bunny: {
        name: 'bunny',
        displayName: 'Bunny',
        image: require('../../assets/avatars/bunny-avatar.png'),
    },
    cat: {
        name: 'cat',
        displayName: 'Cat',
        image: require('../../assets/avatars/cat-avatar.png'),
    },
    croc: {
        name: 'croc',
        displayName: 'Crocodile',
        image: require('../../assets/avatars/croc-avatar.png'),
    },
    fox: {
        name: 'fox',
        displayName: 'Fox',
        image: require('../../assets/avatars/fox-avatar.png'),
    },
    hen: {
        name: 'hen',
        displayName: 'Hen',
        image: require('../../assets/avatars/hen-avatar.png'),
    },
    lion: {
        name: 'lion',
        displayName: 'Lion',
        image: require('../../assets/avatars/lion-avatar.png'),
    },
    puppy: {
        name: 'puppy',
        displayName: 'Puppy',
        image: require('../../assets/avatars/puppy-avatar.png'),
    },
    squirrel: {
        name: 'squirrel',
        displayName: 'Squirrel',
        image: require('../../assets/avatars/squirrel-avatar.png'),
    },
};

// Get all avatar options as an array
export const getAvatarList = () => {
    return Object.values(AVATAR_OPTIONS);
};

// Get avatar by name
export const getAvatarByName = (avatarName) => {
    if (!avatarName || !AVATAR_OPTIONS[avatarName]) {
        // Return default avatar if name is invalid
        return AVATAR_OPTIONS.cat; // Cat as default
    }
    return AVATAR_OPTIONS[avatarName];
};

// Get random avatar for new users
export const getRandomAvatar = () => {
    const avatars = getAvatarList();
    const randomIndex = Math.floor(Math.random() * avatars.length);
    return avatars[randomIndex];
};

// Get avatar image source by name (for use in Image component)
export const getAvatarImageSource = (avatarName) => {
    return getAvatarByName(avatarName).image;
};

// Get avatar display name
export const getAvatarDisplayName = (avatarName) => {
    return getAvatarByName(avatarName).displayName;
};
