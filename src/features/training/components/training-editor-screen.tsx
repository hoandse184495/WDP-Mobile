import { useState } from 'react';
import { Controller, useFieldArray, useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { Alert, Text, View } from 'react-native';
import { trainingPlanRoles } from '@/core/constants/roles';
import { ui } from '@/core/theme/theme';
import { clubDate } from '@/core/utils/date';
import { Button, Card, Choice, Failure, Field, Loading, Screen } from '@/shared/components/ui';
import { FormField } from '@/shared/components/form-field';
import { RoleGuard } from '@/shared/components/role-guard';
import { useHorses } from '@/features/horses/hooks/use-horses';
import { workspaceApi } from '@/features/workspace/api/workspace-api';
import { WorkspaceRecord } from '@/features/workspace/types/catalog';
import { referenceId, Reference } from '@/shared/types/api';
import { trainingApi } from '../api/training-api';
import { trainingSchema, TrainingInput } from '../schemas/training-schema';
const exercise = (index: number): TrainingInput['exercises'][number] => ({
  key: `exercise_${index}`,
  title: '',
  distance: 1000,
  surface: 'dirt',
  workloadLevel: 'light',
  targetHeartRateMax: 180,
  targetSpeedMax: 15,
  instructions: '',
});
function Editor({ id, record }: { id?: string; record?: WorkspaceRecord }) {
  const [horseSearch, setHorseSearch] = useState('');
  const horses = useHorses(horseSearch);
  const client = useQueryClient();
  const initial = record
    ? trainingSchema.parse({
        title: record.title,
        horseId: referenceId(record.horseId as Reference),
        phase: record.phase,
        startDate: clubDate(new Date(String(record.startDate))),
        endDate: clubDate(new Date(String(record.endDate))),
        description: record.description ?? '',
        instructions: record.instructions ?? '',
        exercises:
          Array.isArray(record.exercises) && record.exercises.length
            ? record.exercises
            : [
                {
                  key: 'legacy',
                  title: 'Bài tập mặc định',
                  distance: record.distance,
                  surface: record.surface,
                  workloadLevel: record.workloadLevel,
                  targetHeartRateMax: record.targetHeartRateMax,
                  targetSpeedMax: record.targetSpeedMax,
                  instructions: record.instructions ?? '',
                },
              ],
      })
    : {
        title: '',
        horseId: '',
        phase: 'build_up' as const,
        startDate: clubDate(),
        endDate: clubDate(),
        description: '',
        instructions: '',
        exercises: [exercise(1)],
      };
  const form = useForm<TrainingInput>({
    resolver: zodResolver(trainingSchema),
    defaultValues: initial,
  });
  const array = useFieldArray({ control: form.control, name: 'exercises' });
  const values = useWatch({ control: form.control });
  const activePlan = useQuery({
    queryKey: ['training-active', values.horseId],
    enabled: !id && Boolean(values.horseId),
    queryFn: ({ signal }) =>
      workspaceApi.list('training', 1, values.horseId, signal, { isActive: 'true' }),
  });
  const submitPlan = (input: TrainingInput) => {
    const current = activePlan.data?.items[0];
    if (!id && current)
      Alert.alert(
        'Thay thế giáo án đang áp dụng?',
        'Giáo án ' +
          String(current.title ?? '') +
          ' sẽ ngừng áp dụng. Lịch tập chưa thực hiện của bản cũ sẽ được đồng bộ theo giáo án mới.',
        [
          { text: 'Quay lại', style: 'cancel' },
          { text: 'Thay thế', onPress: () => mutation.mutate(input) },
        ],
      );
    else mutation.mutate(input);
  };
  const mutation = useMutation({
    mutationFn: (input: TrainingInput) =>
      trainingApi.save(input, id, typeof record?.revision === 'number' ? record.revision : 0),
    onSuccess: async () => {
      await Promise.all([
        client.invalidateQueries({ queryKey: ['workspace', 'training'] }),
        client.invalidateQueries({ queryKey: ['record', 'training'] }),
        client.invalidateQueries({ queryKey: ['task-options'] }),
        client.invalidateQueries({ queryKey: ['operation-options'] }),
        client.invalidateQueries({ queryKey: ['dashboard'] }),
      ]);
      router.back();
    },
  });
  return (
    <Screen>
      <Text style={ui.title}>{id ? 'Cập nhật giáo án' : 'Giáo án mới'}</Text>
      <FormField control={form.control} name="title" label="Tên giáo án" />
      {!id && (
        <>
          <Choice
            label="Ngựa"
            onSearch={setHorseSearch}
            loading={horses.isFetching && !horses.isFetchingNextPage}
            error={horses.error}
            onRetry={() => void horses.refetch()}
            hasMore={horses.hasNextPage}
            loadingMore={horses.isFetchingNextPage}
            onLoadMore={() => void horses.fetchNextPage()}
            value={values.horseId}
            onChange={(value) => form.setValue('horseId', value, { shouldValidate: true })}
            options={
              horses.data?.pages
                .flatMap((p) => p.items)
                .filter(
                  (h) =>
                    !h.isTrainingLocked && (!h.admissionStatus || h.admissionStatus === 'active'),
                )
                .map((h) => ({ value: h._id, label: `${h.name} · ${h.registrationCode}` })) ?? []
            }
          />
          {form.formState.errors.horseId && <Text style={ui.error}>Chọn ngựa được phân công.</Text>}
        </>
      )}
      <Choice
        label="Giai đoạn"
        value={values.phase}
        onChange={(value) => form.setValue('phase', value)}
        options={(['build_up', 'sprint', 'endurance', 'recovery', 'pre_race'] as const).map(
          (value) => ({ value, label: value }),
        )}
      />
      <FormField
        control={form.control}
        name="startDate"
        label="Ngày bắt đầu (YYYY-MM-DD)"
        editable={!id}
      />
      <FormField control={form.control} name="endDate" label="Ngày kết thúc (YYYY-MM-DD)" />
      <FormField control={form.control} name="description" label="Mô tả" multiline />
      <FormField control={form.control} name="instructions" label="Hướng dẫn chung" multiline />
      {array.fields.map((field, index) => (
        <Card key={field.id}>
          <Text style={ui.heading}>Bài tập {index + 1}</Text>
          <FormField
            control={form.control}
            name={`exercises.${index}.key`}
            label="Mã bài tập"
            autoCapitalize="none"
          />
          <FormField control={form.control} name={`exercises.${index}.title`} label="Tên bài tập" />
          {(
            [
              { key: 'distance', label: 'Quãng đường (m, ≥100)' },
              { key: 'targetHeartRateMax', label: 'Ngưỡng nhịp tim (60–250 bpm)' },
              { key: 'targetSpeedMax', label: 'Ngưỡng tốc độ (5–30 m/s)' },
            ] as const
          ).map((item) => (
            <Controller
              key={item.key}
              control={form.control}
              name={`exercises.${index}.${item.key}`}
              render={({ field: input, fieldState }) => (
                <Field
                  label={item.label}
                  keyboardType="decimal-pad"
                  value={Number.isNaN(input.value) ? '' : String(input.value)}
                  onChangeText={(text) => input.onChange(text.trim() ? Number(text) : NaN)}
                  error={fieldState.error?.message}
                />
              )}
            />
          ))}
          <Choice
            label="Mặt sân"
            value={values.exercises?.[index]?.surface}
            onChange={(value) => form.setValue(`exercises.${index}.surface`, value)}
            options={(['dirt', 'turf', 'synthetic'] as const).map((value) => ({
              value,
              label: value,
            }))}
          />
          <Choice
            label="Cường độ"
            value={values.exercises?.[index]?.workloadLevel}
            onChange={(value) => form.setValue(`exercises.${index}.workloadLevel`, value)}
            options={(['light', 'moderate', 'intense', 'maximum'] as const).map((value) => ({
              value,
              label: value,
            }))}
          />
          <FormField
            control={form.control}
            name={`exercises.${index}.instructions`}
            label="Hướng dẫn bài tập"
            multiline
          />
          <Button
            title="Bỏ bài tập"
            danger
            disabled={array.fields.length === 1}
            onPress={() => array.remove(index)}
          />
        </Card>
      ))}
      {array.fields.length < 20 && (
        <Button secondary title="Thêm bài tập" onPress={() => array.append(exercise(Date.now()))} />
      )}
      {form.formState.errors.exercises?.root?.message && (
        <Text style={ui.error}>{form.formState.errors.exercises.root.message}</Text>
      )}
      {activePlan.error && (
        <Failure error={activePlan.error} retry={() => void activePlan.refetch()} />
      )}
      {mutation.error && <Failure error={mutation.error} />}
      <View>
        <Button
          title="Lưu giáo án"
          busy={mutation.isPending}
          disabled={!id && Boolean(values.horseId) && (activePlan.isPending || activePlan.isError)}
          onPress={form.handleSubmit(submitPlan)}
        />
      </View>
    </Screen>
  );
}
function LoadEditor({ id }: { id: string }) {
  const query = useQuery({
    queryKey: ['record', 'training', id],
    queryFn: ({ signal }) => workspaceApi.detail('training', id, signal),
  });
  return query.data ? (
    <Editor id={id} record={query.data} />
  ) : (
    <Screen>
      {query.isPending ? (
        <Loading />
      ) : (
        <Failure error={query.error} retry={() => void query.refetch()} />
      )}
    </Screen>
  );
}
export default function TrainingEditorScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  return (
    <RoleGuard roles={trainingPlanRoles}>{id ? <LoadEditor id={id} /> : <Editor />}</RoleGuard>
  );
}
