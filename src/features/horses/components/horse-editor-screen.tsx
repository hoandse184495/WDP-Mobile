import { useState } from 'react';
import { useReferenceOptions } from '@/features/operations/hooks/use-reference-options';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { Text } from 'react-native';
import { ui } from '@/core/theme/theme';
import { useSession } from '@/features/auth/stores/session-store';
import { Button, Choice, Failure, Loading, Screen } from '@/shared/components/ui';
import { FormField } from '@/shared/components/form-field';
import { RoleGuard } from '@/shared/components/role-guard';
import { horseApi } from '../api/horse-api';
import { horseEditSchema, HorseEdit, horseInputSchema, HorseInput } from '../schemas/horse-schema';
import { useHorse } from '../hooks/use-horses';
import { Horse } from '../types/horse';

function CreateHorse() {
  const client = useQueryClient();
  const form = useForm<HorseInput>({
    resolver: zodResolver(horseInputSchema),
    defaultValues: {
      name: '',
      registrationCode: '',
      breed: '',
      gender: 'colt',
      dateOfBirth: '',
      ownerId: '',
      stallId: '',
      trainerId: '',
      groomId: '',
      vetId: '',
      color: '',
      notes: '',
    },
  });
  const [ownerSearch, setOwnerSearch] = useState('');
  const owners = useReferenceOptions(
    { path: '/users', key: 'users', paged: true, params: { role: 'horse_owner' } },
    {},
    undefined,
    ownerSearch,
  );
  const placement = useQuery({
    queryKey: ['horse-create-options'],
    queryFn: horseApi.creationOptions,
  });
  const values = useWatch({ control: form.control });
  const mutation = useMutation({
    mutationFn: horseApi.create,
    onSuccess: async (horse) => {
      await client.invalidateQueries({ queryKey: ['horses'] });
      router.replace({ pathname: '/horses/[id]', params: { id: horse._id } });
    },
  });
  return (
    <Screen>
      <Text style={ui.title}>Thêm ngựa</Text>
      <FormField control={form.control} name="name" label="Tên ngựa" />
      <FormField control={form.control} name="registrationCode" label="Mã đăng ký" />
      <FormField control={form.control} name="breed" label="Giống" />
      <Choice
        label="Giới tính"
        value={values.gender}
        onChange={(v) => form.setValue('gender', v)}
        options={['colt', 'filly', 'stallion', 'mare', 'gelding'].map((value) => ({
          value: value as HorseInput['gender'],
          label: value,
        }))}
      />
      <FormField
        control={form.control}
        name="dateOfBirth"
        label="Ngày sinh (YYYY-MM-DD)"
        placeholder="2020-01-31"
      />
      <FormField control={form.control} name="color" label="Màu lông" />
      <Choice
        label="Chủ sở hữu"
        value={values.ownerId}
        onChange={(v) => form.setValue('ownerId', v, { shouldValidate: true })}
        onSearch={setOwnerSearch}
        loading={owners.isFetching && !owners.isFetchingNextPage}
        error={owners.error}
        onRetry={() => void owners.refetch()}
        hasMore={owners.hasNextPage}
        loadingMore={owners.isFetchingNextPage}
        onLoadMore={() => void owners.fetchNextPage()}
        options={
          owners.data?.pages
            .flatMap((p) => p.rows)
            .filter((o) => o.isActive)
            .map((o) => ({ value: String(o._id), label: String(o.fullName) })) ?? []
        }
      />
      {placement.isPending ? (
        <Loading />
      ) : placement.error ? (
        <Failure error={placement.error} retry={() => void placement.refetch()} />
      ) : (
        <>
          <Choice
            label="Ô chuồng tiếp nhận (tùy chọn)"
            value={values.stallId}
            onChange={(v) => form.setValue('stallId', v)}
            options={[
              { value: '', label: 'Bố trí sau' },
              ...(placement.data?.stalls
                .filter(
                  (stall) =>
                    stall.isActive &&
                    !stall.maintenance &&
                    !stall.occupied &&
                    ['normal', 'admission_quarantine'].includes(stall.type),
                )
                .map((stall) => ({ value: stall._id, label: stall.code })) ?? []),
            ]}
          />
          {(['trainerId', 'groomId', 'vetId'] as const).map((key) => (
            <Choice
              key={key}
              label={
                {
                  trainerId: 'Huấn luyện viên phụ trách',
                  groomId: 'Groom phụ trách',
                  vetId: 'Bác sĩ khám đầu vào',
                }[key]
              }
              value={values[key]}
              onChange={(v) => form.setValue(key, v)}
              options={[
                { value: '', label: 'Phân công sau' },
                ...(placement.data?.[
                  { trainerId: 'trainers', groomId: 'grooms', vetId: 'vets' }[key] as
                    'trainers' | 'grooms' | 'vets'
                ].map((person) => ({ value: person._id, label: person.fullName })) ?? []),
              ]}
            />
          ))}
        </>
      )}
      <Text style={ui.muted}>Ngựa mới cần được bác sĩ khám đầu vào trước khi huấn luyện.</Text>
      <FormField control={form.control} name="notes" label="Ghi chú" multiline />
      {mutation.error && <Failure error={mutation.error} />}
      <Button
        title="Tạo hồ sơ"
        busy={mutation.isPending}
        onPress={form.handleSubmit((value) => mutation.mutate(value))}
      />
    </Screen>
  );
}
function EditHorse({ horse }: { horse: Horse }) {
  const client = useQueryClient();
  const form = useForm<HorseEdit>({
    resolver: zodResolver(horseEditSchema),
    defaultValues: {
      name: horse.name,
      breed: horse.breed,
      notes: horse.notes ?? '',
      currentWeight: horse.currentWeight?.toString() ?? '',
      height: horse.height?.toString() ?? '',
      fitnessScore: String(horse.fitnessScore),
    },
  });
  const mutation = useMutation({
    mutationFn: (value: HorseEdit) => horseApi.update(horse._id, value),
    onSuccess: async () => {
      await Promise.all([
        client.invalidateQueries({ queryKey: ['horses'] }),
        client.invalidateQueries({ queryKey: ['horse', horse._id] }),
      ]);
      router.back();
    },
  });
  return (
    <Screen>
      <Text style={ui.title}>Cập nhật {horse.name}</Text>
      <FormField control={form.control} name="name" label="Tên ngựa" />
      <FormField control={form.control} name="breed" label="Giống" />
      <FormField
        control={form.control}
        name="currentWeight"
        label="Cân nặng (kg)"
        keyboardType="decimal-pad"
      />
      <FormField
        control={form.control}
        name="height"
        label="Chiều cao (hands)"
        keyboardType="decimal-pad"
      />
      <FormField
        control={form.control}
        name="fitnessScore"
        label="Thể lực (0–100)"
        keyboardType="decimal-pad"
      />
      <FormField control={form.control} name="notes" label="Ghi chú" multiline />
      {mutation.error && <Failure error={mutation.error} />}
      <Button
        title="Lưu thay đổi"
        busy={mutation.isPending}
        onPress={form.handleSubmit((value) => mutation.mutate(value))}
      />
    </Screen>
  );
}
function LoadEditor({ id }: { id: string }) {
  const query = useHorse(id);
  return query.data ? (
    <EditHorse horse={query.data} />
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
export default function HorseEditorScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const user = useSession((state) => state.user);
  return (
    <RoleGuard roles={id ? ['club_manager', 'head_trainer'] : ['club_manager']}>
      {id && user ? <LoadEditor id={id} /> : <CreateHorse />}
    </RoleGuard>
  );
}
