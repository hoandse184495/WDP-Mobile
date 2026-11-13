import { Control, Controller, FieldPath, FieldValues } from 'react-hook-form';
import { Field, FieldProps } from './ui';
export function FormField<T extends FieldValues>({
  control,
  name,
  label,
  ...props
}: FieldProps & { control: Control<T>; name: FieldPath<T> }) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <Field
          {...props}
          icon={
            props.icon ??
            (name.toLowerCase().includes('password')
              ? 'lock'
              : name === 'email'
                ? 'mail'
                : undefined)
          }
          label={label}
          value={String(field.value ?? '')}
          onChangeText={field.onChange}
          onBlur={field.onBlur}
          error={fieldState.error?.message}
        />
      )}
    />
  );
}
