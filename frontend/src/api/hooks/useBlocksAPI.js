import { useApiCore } from '../core/useApiCore.js';
import * as blocksApi from '../modules/blocks.api.js';

export const useBlocksAPI = () => {
    const { makeAuthenticatedRequest } = useApiCore();
    return {
        getBlocksByDayId: (scheduleId, dayId) =>
            blocksApi.getBlocksByDayId(makeAuthenticatedRequest, scheduleId, dayId),
        addBlocksToDay: (scheduleId, dayId, blocks) =>
            blocksApi.addBlocksToDay(makeAuthenticatedRequest, scheduleId, dayId, blocks),
        updateBlockInDay: (scheduleId, dayId, blockId, data) =>
            blocksApi.updateBlockInDay(makeAuthenticatedRequest, scheduleId, dayId, blockId, data),
        deleteBlockFromDay: (scheduleId, dayId, blockId) =>
            blocksApi.deleteBlockFromDay(makeAuthenticatedRequest, scheduleId, dayId, blockId),
        markBlockCompleteInDay: (scheduleId, dayId, blockId, completed) =>
            blocksApi.markBlockCompleteInDay(
                makeAuthenticatedRequest,
                scheduleId,
                dayId,
                blockId,
                completed,
            ),
    };
};
