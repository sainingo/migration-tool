import { createLogger } from '../utils/logger.js';

export class IdMappingService {
    constructor() {
        this.mappings = new Map();
        this.logger = createLogger();
    }

    addMapping(type, sourceId, targetId) {
        const key = `${type}:${sourceId}`;
        this.mappings.set(key, targetId);
        this.logger.debug(`Mapped ${type} ID: ${sourceId} -> ${targetId}`);
    }

    getTargetId(type, sourceId) {
        const key = `${type}:${sourceId}`;
        const targetId = this.mappings.get(key);
        if (!targetId) {
            throw new Error(`No mapping found for ${type} with source ID: ${sourceId}`);
        }
        return targetId;
    }

    clear() {
        this.mappings.clear();
    }
}