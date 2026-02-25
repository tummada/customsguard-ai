import { v7 as uuidv7 } from 'uuid';

/**
 * Generates a UUID v7 (time-ordered)
 */
export const generateUUIDv7 = (): string => {
    return uuidv7();
};
