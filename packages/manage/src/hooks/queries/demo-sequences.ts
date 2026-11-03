import { useMutation } from '@tanstack/react-query';
import { http } from '@/utils/request';

export interface DemoSequenceValue {
    id: number;
    type: string;
    sequence: number;
}

export function useNextDemoSequence() {
    return useMutation({
        mutationFn: (type: string) => http.post<DemoSequenceValue>('/api-backend/demo/sequence/next', { type }),
    });
}
