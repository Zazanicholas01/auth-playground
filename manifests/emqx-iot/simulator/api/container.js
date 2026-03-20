export function createContainer() {
    const factories = new Map();
    const singletons = new Map();

    return {
        register(name, factory) {
            factories.set(name, factory);
        },

        get(name) {
            if (singletons.has(name)) return singletons.get(name);
            if (!factories.has(name)) {
                throw new Error(`Unknown dependency: ${name}`);
            }

            const value = factories.get(name)(this);
            singletons.set(name, value);
            return value;
        },
    };
}
