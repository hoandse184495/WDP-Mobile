import { apiClient, requestData } from '@/core/network/api-client';
import { TrainingInput, ReviewInput } from '../schemas/training-schema';
export const trainingApi = {
  save: (value: TrainingInput, id?: string, revision?: number) =>
    id
      ? requestData(
          apiClient.put(`/training-plans/${id}`, {
            title: value.title,
            phase: value.phase,
            endDate: `${value.endDate}T23:59:59+07:00`,
            description: value.description,
            instructions: value.instructions,
            exercises: value.exercises,
            revision,
          }),
        )
      : requestData(
          apiClient.post('/training-plans', {
            ...value,
            startDate: `${value.startDate}T00:00:00+07:00`,
            endDate: `${value.endDate}T23:59:59+07:00`,
          }),
        ),
  review: (id: string, input: ReviewInput) =>
    requestData(apiClient.put(`/training-sessions/${id}`, input)),
};
