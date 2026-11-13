import { Controller, useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { Text } from 'react-native';
import { ui } from '@/core/theme/theme';
import {
  Button,
  Card,
  Choice,
  Empty,
  Failure,
  Field,
  Loading,
  Screen,
} from '@/shared/components/ui';
import { FormField } from '@/shared/components/form-field';
import { RoleGuard } from '@/shared/components/role-guard';
import { RecordDetails } from '@/features/workspace/components/record-details';
import { getModule, recordTitle, type WorkspaceRecord } from '@/features/workspace/types/catalog';
import { sessionApi } from '../api/session-api';
import { SessionDetails } from './session-details';
import { reviewSchema, type ReviewInput } from '../schemas/training-schema';
import { trainingApi } from '../api/training-api';
export function ReviewForm({ id, record }: { id: string; record: WorkspaceRecord }) {
  const client = useQueryClient();
  const form = useForm<ReviewInput>({
    resolver: zodResolver(reviewSchema),
    defaultValues: {
      performanceRating:
        typeof record.performanceRating === 'number' ? record.performanceRating : undefined,
      trainerNotes: typeof record.trainerNotes === 'string' ? record.trainerNotes : '',
      fitnessScore: undefined,
    },
  });
  const values = useWatch({ control: form.control });
  const mutation = useMutation({
    mutationFn: (input: ReviewInput) => trainingApi.review(id, input),
    onSuccess: async () => {
      await Promise.all(
        ['workspace', 'record', 'dashboard', 'horse', 'horses', 'notifications'].map((key) =>
          client.invalidateQueries({ queryKey: [key] }),
        ),
      );
      router.back();
    },
  });
  return (
    <Screen>
      <Text style={ui.title}>Đánh giá buổi tập</Text>
      <Card>
        <Text style={ui.heading}>{recordTitle(record)}</Text>
        <RecordDetails config={getModule('sessions')!} record={record} />
      </Card>
      <SessionDetails record={record} />
      <Choice
        label="Mức đánh giá / 5"
        value={
          values.performanceRating === undefined ? undefined : String(values.performanceRating)
        }
        onChange={(value) =>
          form.setValue('performanceRating', Number(value), {
            shouldDirty: true,
            shouldValidate: true,
          })
        }
        options={[1, 2, 3, 4, 5].map((value) => ({ value: String(value), label: String(value) }))}
      />
      {form.formState.errors.performanceRating && (
        <Text style={ui.error}>Chọn mức đánh giá trước khi lưu.</Text>
      )}
      <FormField
        control={form.control}
        name="trainerNotes"
        label="Nhận xét huấn luyện viên"
        multiline
      />
      <Controller
        control={form.control}
        name="fitnessScore"
        render={({ field, fieldState }) => (
          <Field
            label="Điểm thể lực (0–100, tùy chọn)"
            keyboardType="decimal-pad"
            value={field.value === undefined ? '' : String(field.value)}
            onChangeText={(value) =>
              field.onChange(value.trim() === '' ? undefined : Number(value))
            }
            error={fieldState.error?.message}
          />
        )}
      />
      {mutation.error && <Failure error={mutation.error} />}
      <Button
        title="Lưu đánh giá"
        busy={mutation.isPending}
        onPress={form.handleSubmit((value) => mutation.mutate(value))}
      />
    </Screen>
  );
}
function LoadReview({ id }: { id: string }) {
  const query = useQuery({
    queryKey: ['record', 'sessions', id, 1],
    queryFn: ({ signal }) => sessionApi.get(id, signal),
  });
  if (query.isError || !query.data)
    return (
      <Screen>
        {query.isPending ? (
          <Loading />
        ) : (
          <Failure error={query.error} retry={() => void query.refetch()} />
        )}
      </Screen>
    );
  if (query.data.status !== 'completed')
    return (
      <Screen>
        <Empty label="Buổi tập chưa đủ điều kiện đánh giá" />
      </Screen>
    );
  return <ReviewForm key={id} id={id} record={query.data} />;
}
export default function SessionReviewScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return (
    <RoleGuard roles={['head_trainer']}>
      <LoadReview id={id} />
    </RoleGuard>
  );
}
