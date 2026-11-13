import { useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as Crypto from 'expo-crypto';
import { router } from 'expo-router';
import { Text } from 'react-native';
import { ui } from '@/core/theme/theme';
import { clubDate } from '@/core/utils/date';
import { referenceId } from '@/shared/types/api';
import { useSession } from '@/features/auth/stores/session-store';
import { useHorses } from '@/features/horses/hooks/use-horses';
import { Button, Choice, Failure, Loading, Screen } from '@/shared/components/ui';
import { RoleGuard } from '@/shared/components/role-guard';
import { FormField } from '@/shared/components/form-field';
import { scheduleApi, assignedGrooms } from '../api/schedule-api';
import { scheduleSchema, ScheduleInput } from '../schemas/schedule-schema';
import { typeLabels } from '../types/task';
import { DateField } from '@/shared/components/date-field';
import { AppError } from '@/core/errors/app-error';
import { ResponseSummary } from '@/features/operations/components/response-summary';
function ScheduleForm() {
  const user = useSession((state) => state.user)!;
  const trainer = user.role === 'head_trainer';
  const client = useQueryClient();
  const [requestKey] = useState(() => Crypto.randomUUID());
  const [horseSearch, setHorseSearch] = useState('');
  const horses = useHorses(horseSearch);
  const options = useQuery({ queryKey: ['task-options'], queryFn: scheduleApi.options });
  const form = useForm<ScheduleInput>({
    resolver: zodResolver(scheduleSchema),
    defaultValues: {
      title: '',
      type: trainer ? 'training' : 'bathing',
      horseId: '',
      stallId: '',
      groomId: '',
      trainingPlanId: '',
      trainingExerciseKey: '',
      rationPlanId: '',
      rationMealKey: '',
      start: `${clubDate()}T08:00`,
      end: `${clubDate()}T09:00`,
      instructions: '',
    },
  });
  const values = useWatch({ control: form.control });
  const [mode, setMode] = useState('single');
  const [date, setDate] = useState(clubDate());
  const [dates, setDates] = useState<string[]>([]);
  const [preview, setPreview] = useState<{
    fingerprint: string;
    data: Record<string, unknown>;
  } | null>(null);
  const fingerprint = JSON.stringify({ values, dates });
  const plans =
    options.data?.plans.filter((plan) => referenceId(plan.horseId) === values.horseId) ?? [];
  const selectedPlan = plans.find((plan) => plan._id === values.trainingPlanId);
  const previewMutation = useMutation({
    mutationFn: async (input: ScheduleInput) => {
      if (!dates.length) throw new AppError('Chọn ít nhất một ngày cho lịch lặp.');
      return scheduleApi.previewBatch(input, dates, requestKey, selectedPlan?.revision ?? 0);
    },
    onSuccess: (data) => setPreview({ fingerprint, data }),
  });
  const rations =
    options.data?.rationPlans.filter((plan) => referenceId(plan.horseId) === values.horseId) ?? [];
  const grooms =
    values.type === 'stall_cleaning'
      ? (options.data?.grooms ?? [])
      : (options.data?.grooms.filter((groom) =>
          assignedGrooms(options.data.assignments, values.horseId ?? '').has(groom._id),
        ) ?? []);
  const mutation = useMutation({
    mutationFn: (input: ScheduleInput) => {
      if (mode === 'batch') {
        if (!preview || preview.fingerprint !== fingerprint || preview.data.valid !== true)
          throw new AppError(
            'Xem trước lịch nhiều ngày và xử lý các ngày không hợp lệ trước khi giao việc.',
          );
        return scheduleApi.createBatch(input, dates, requestKey, selectedPlan?.revision ?? 0);
      }
      return scheduleApi.create(input, requestKey, selectedPlan?.revision ?? 0);
    },
    onSuccess: async () => {
      await Promise.all([
        client.invalidateQueries({ queryKey: ['tasks'] }),
        client.invalidateQueries({ queryKey: ['notifications'] }),
      ]);
      router.back();
    },
  });
  return (
    <Screen>
      <Text style={ui.title}>Giao công việc</Text>
      {options.isPending ? (
        <Loading />
      ) : options.error ? (
        <Failure error={options.error} retry={() => void options.refetch()} />
      ) : (
        <>
          <FormField control={form.control} name="title" label="Tiêu đề công việc" />
          <Choice
            label="Loại công việc"
            value={values.type}
            onChange={(value) => {
              form.setValue('type', value);
              form.setValue('horseId', '');
              form.setValue('stallId', '');
              form.setValue('groomId', '');
            }}
            options={(trainer
              ? (['training', 'feeding', 'bathing', 'stall_cleaning', 'hoof_care'] as const)
              : (['feeding', 'bathing', 'stall_cleaning', 'hoof_care', 'training'] as const)
            ).map((value) => ({ value, label: typeLabels[value] }))}
          />
          {values.type === 'stall_cleaning' ? (
            <Choice
              label="Ô chuồng"
              value={values.stallId}
              onChange={(value) => form.setValue('stallId', value)}
              options={
                options.data?.stalls.map((stall) => ({ value: stall._id, label: stall.code })) ?? []
              }
            />
          ) : (
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
                onChange={(value) => {
                  form.setValue('horseId', value);
                  form.setValue('groomId', '');
                  form.setValue('trainingPlanId', '');
                  form.setValue('trainingExerciseKey', '');
                  form.setValue('rationPlanId', '');
                  form.setValue('rationMealKey', '');
                }}
                options={
                  horses.data?.pages
                    .flatMap((page) => page.items)
                    .map((horse) => ({ value: horse._id, label: horse.name })) ?? []
                }
              />
              {horses.error && <Failure error={horses.error} retry={() => void horses.refetch()} />}
            </>
          )}
          <Choice
            label="Groom được phân công"
            value={values.groomId}
            onChange={(value) => form.setValue('groomId', value)}
            options={grooms.map((groom) => ({ value: groom._id, label: groom.fullName }))}
          />
          {values.type === 'training' && (
            <>
              <Choice
                label="Giáo án"
                value={values.trainingPlanId}
                onChange={(value) => {
                  form.setValue('trainingPlanId', value);
                  form.setValue('trainingExerciseKey', '');
                }}
                options={plans.map((plan) => ({ value: plan._id, label: plan.title }))}
              />
              <Choice
                label="Bài tập"
                value={values.trainingExerciseKey}
                onChange={(value) => form.setValue('trainingExerciseKey', value)}
                options={
                  selectedPlan
                    ? selectedPlan.exercises?.length
                      ? selectedPlan.exercises.map((row) => ({ value: row.key, label: row.title }))
                      : [{ value: 'legacy', label: 'Bài tập mặc định' }]
                    : []
                }
              />
            </>
          )}
          {values.type === 'feeding' && (
            <>
              <Choice
                label="Khẩu phần được duyệt"
                value={values.rationPlanId}
                onChange={(value) => {
                  form.setValue('rationPlanId', value);
                  form.setValue('rationMealKey', '');
                }}
                options={rations.map((plan) => ({ value: plan._id, label: plan.title }))}
              />
              <Choice
                label="Bữa ăn"
                value={values.rationMealKey}
                onChange={(value) => form.setValue('rationMealKey', value)}
                options={
                  rations
                    .find((plan) => plan._id === values.rationPlanId)
                    ?.meals.map((meal) => ({ value: meal.key, label: meal.name })) ?? []
                }
              />
            </>
          )}
          <Text style={ui.muted}>Thời gian theo múi giờ Việt Nam.</Text>
          {(['start', 'end'] as const).map((name) => (
            <Controller
              key={name}
              control={form.control}
              name={name}
              render={({ field, fieldState }) => (
                <>
                  <DateField
                    label={name === 'start' ? 'Bắt đầu dự kiến' : 'Kết thúc dự kiến'}
                    kind="date-time"
                    value={`${field.value}:00+07:00`}
                    onChange={(iso) =>
                      field.onChange(
                        new Date(Date.parse(iso) + 7 * 3600000).toISOString().slice(0, 16),
                      )
                    }
                  />
                  {fieldState.error && <Text style={ui.error}>{fieldState.error.message}</Text>}
                </>
              )}
            />
          ))}
          <Choice
            label="Lịch giao việc"
            value={mode}
            onChange={setMode}
            options={[
              { value: 'single', label: 'Một công việc' },
              { value: 'batch', label: 'Nhiều ngày' },
            ]}
          />
          {mode === 'batch' && (
            <>
              <Text style={ui.muted}>
                Tối đa 31 ngày trong phạm vi 62 ngày. Giữ nguyên giờ bắt đầu và thời lượng trên mỗi
                ngày đã chọn.
              </Text>
              <DateField label="Ngày cần giao việc" value={date} onChange={setDate} />
              <Button
                title="Thêm ngày"
                secondary
                disabled={dates.length >= 31 || dates.includes(date)}
                onPress={() => setDates((old) => [...old, date].sort())}
              />
              {dates.map((day) => (
                <Button
                  key={day}
                  title={`${day} · Bỏ ngày này`}
                  secondary
                  onPress={() => setDates((old) => old.filter((item) => item !== day))}
                />
              ))}
              <Button
                title="Kiểm tra lịch nhiều ngày"
                secondary
                busy={previewMutation.isPending}
                onPress={form.handleSubmit((input) => previewMutation.mutate(input))}
              />
              {preview && (
                <>
                  <ResponseSummary data={preview.data} />
                  {preview.fingerprint !== fingerprint && (
                    <Text style={ui.error}>
                      Lịch đã thay đổi. Kiểm tra lại trước khi giao việc.
                    </Text>
                  )}
                </>
              )}
              {previewMutation.error && <Failure error={previewMutation.error} />}
            </>
          )}
          <FormField control={form.control} name="instructions" label="Hướng dẫn" multiline />
          {['horseId', 'groomId', 'trainingPlanId', 'rationPlanId'].map((key) => {
            const error = form.formState.errors[key as keyof ScheduleInput];
            return error ? (
              <Text key={key} style={ui.error}>
                {error.message}
              </Text>
            ) : null;
          })}
          {mutation.error && <Failure error={mutation.error} />}
          <Button
            title={mode === 'batch' ? 'Giao toàn bộ lịch đã kiểm tra' : 'Giao công việc'}
            busy={mutation.isPending}
            onPress={form.handleSubmit((value) => mutation.mutate(value))}
          />
        </>
      )}
    </Screen>
  );
}
export default function TaskScheduleScreen() {
  return (
    <RoleGuard roles={['club_manager', 'head_trainer']}>
      <ScheduleForm />
    </RoleGuard>
  );
}
