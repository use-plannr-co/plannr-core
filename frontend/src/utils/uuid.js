let nextId = 0;

const generateId = (name, type) => {
    return `${name}-${type}_${nextId++}_${Date.now()}`;
};

export default generateId;
