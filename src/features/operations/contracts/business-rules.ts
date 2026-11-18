import { clubDate, shiftDay } from '@/core/utils/date';
import * as Crypto from 'expo-crypto';
import { InputSchema, JsonRecord, Operation, asRecord, entityId } from '../types/operation';
import { initialObject, normalizeInput, schemaFor, validateInput } from './schema';
import { incidentTransitions } from '@/features/incidents/utils/lifecycle';
export function operationSchema(operation: Operation, context?: JsonRecord): InputSchema {
  const source = schemaFor(operation.contract);
  const properties = Object.fromEntries(
    Object.entries(source.properties ?? {}).filter(([key]) => !operation.omit?.includes(key)),
  );
  const required = (source.required ?? []).filter((key) => !operation.omit?.includes(key));
  if (operation.id === 'sessions.override') required.push('overrideReason');
  if (operation.id === 'incidents.status' && context)
    properties.status = { type: 'string', enum: incidentTransitions(context) };
  return { ...source, properties, required };
}
export function operationInitial(operation: Operation, context: JsonRecord): JsonRecord {
  const row = { ...context, ...operation.initial };
  if (operation.module === 'warehouses') {
    delete row.stableId;
    row.assignedGroomIds = Array.isArray(row.assignedGroomIds)
      ? row.assignedGroomIds.map(entityId).filter(Boolean)
      : [];
  }
  if (operation.id === 'incidents.status') row.status = incidentTransitions(context)[0];
  if (operation.module === 'receipts')
    row.warehouseId = context.warehouseId ?? entityId(context.warehouse);
  if (operation.module === 'transfers') {
    row.sourceWarehouseId = context.sourceWarehouseId ?? entityId(context.sourceWarehouse);
    row.destinationWarehouseId =
      context.destinationWarehouseId ?? entityId(context.destinationWarehouse);
  }
  if (operation.id === 'horses.pedigree' || operation.id === 'horses.propose')
    row.links = context.editable ?? context.declaration;
  if (operation.id === 'tasks.edit') {
    row.trainingExerciseKey = context.trainingExerciseKey;
    row.trainingPlanRevision =
      context.trainingPlanRevision ?? asRecord(context.trainingPlanId).revision;
    for (const key of ['groomId', 'rationPlanId']) row[key] = entityId(context[key]) || undefined;
  }
  if (operation.id === 'medical.encounter' && context._selectedHorse) {
    row.record = {
      horseId: entityId(context.horseId),
      type: 'emergency',
      examinationDate: new Date().toISOString(),
    };
  }
  if (operation.id === 'incidents.encounter') {
    row.incident = { id: context._id, revision: context.revision };
    row.record = {
      horseId: entityId(context.horseId),
      type: 'emergency',
      examinationDate: new Date().toISOString(),
    };
  }
  if (operation.id === 'schedules.encounter') {
    row.completeSchedule = { id: context._id, revision: context.revision };
    row.record = {
      horseId: entityId(context.horseId),
      type: 'follow_up',
      examinationDate: new Date().toISOString(),
    };
    const details = asRecord(context._details),
      ids = Array.isArray(details.initialInjuryIds) ? details.initialInjuryIds.map(String) : [];
    row.injuries = Array.isArray(details.injuries)
      ? details.injuries
          .map(asRecord)
          .filter((injury) => ids.includes(entityId(injury)))
          .map((injury) => ({
            mode: 'existing',
            id: entityId(injury),
            expectedVersion: injury.__v ?? 0,
          }))
      : [];
  }
  if (operation.id === 'prescriptions.issue' && Array.isArray(row.lines))
    row.lines = row.lines.filter(
      (value) =>
        Number(
          asRecord(value).remaining ??
            Number(asRecord(value).quantity) - Number(asRecord(value).supplied ?? 0),
        ) > 0,
    );
  if (['stocktakes.save', 'prescriptions.issue'].includes(operation.id) && Array.isArray(row.lines))
    row.lines = row.lines.map((value) => {
      const line = asRecord(value);
      return {
        ...line,
        lineId: line._id,
        quantity:
          operation.id === 'prescriptions.issue'
            ? (line.remaining ?? Number(line.quantity) - Number(line.supplied ?? 0))
            : line.quantity,
      };
    });
  if (operation.id === 'rations.create') {
    row.validFrom ??= clubDate();
    row.validTo ??= shiftDay(String(row.validFrom), 7);
    row.meals ??= [{ name: 'Bữa sáng', time: '07:00', lines: [{}] }];
  }
  if (operation.id === 'schedules.create') {
    row.autoCoordinate ??= true;
    row.prepareMinutes ??= 0;
    row.returnMinutes ??= 0;
    row.dueDate ??= clubDate();
  }
  if (
    operation.id === 'schedules.complete' &&
    ['vaccination', 'deworming'].includes(String(row.type))
  ) {
    const cabinet = asRecord(context._cabinet),
      warehouse = asRecord(cabinet.warehouse);
    row.administration = {
      performedOn: clubDate(),
      productName: '',
      dose: '',
      lotNumber: '',
      reaction: '',
    };
    row.stockIssue = {
      warehouseId: warehouse._id,
      stockVersion: warehouse.stockVersion,
      itemId: undefined,
      quantity: undefined,
    };
    row.nextDueDate =
      Number(row.repeatDays) > 0 ? shiftDay(clubDate(), Number(row.repeatDays)) : null;
  }
  const schema = operationSchema(operation),
    body = initialObject(schema, row);
  if (schema.properties?.requestKey) body.requestKey = Crypto.randomUUID();
  if (operation.id === 'disposals.create') {
    body.warehouseId = row.warehouseId;
    body.quantity = undefined;
  }
  return body;
}
export function prepareOperation(operation: Operation, input: JsonRecord): JsonRecord {
  const body = asRecord(normalizeInput(operationSchema(operation), input));
  if (operation.id === 'tasks.bulk' && Array.isArray(body.tasks)) {
    body.tasks = body.tasks.map((value, index) => {
      const row = {
        ...asRecord(value),
        requestKey:
          typeof body.requestKey === 'string'
            ? body.requestKey.slice(0, -4) + index.toString(16).padStart(4, '0')
            : undefined,
      };
      return row;
    });
  }
  if (['schedules.create', 'schedules.edit'].includes(operation.id) && body.type === 'follow_up')
    body.repeatDays = 0;
  if (operation.id === 'replenishments.decision' && body.status !== 'approved')
    delete body.quantity;
  if (operation.module === 'warehouses') {
    // New warehouses are independent of stables. Do not silently clear legacy stable links on edit.
    delete body.stableId;
    if (body.type === 'medicine_cabinet') body.assignedGroomIds = [];
    else if (operation.id === 'warehouses.edit') body.responsibleVetId = null;
    else delete body.responsibleVetId;
    if (Array.isArray(body.assignedGroomIds))
      body.assignedGroomIds = [...new Set(body.assignedGroomIds.map(entityId).filter(Boolean))];
  }
  return body;
}
export function operationErrors(
  operation: Operation,
  body: JsonRecord,
  withoutPreview = false,
  context?: JsonRecord,
): string[] {
  const schema = operationSchema(operation);
  const checked = withoutPreview
    ? {
        ...schema,
        required: schema.required?.filter((key) => !['token', 'previewHash'].includes(key)),
      }
    : schema;
  const errors = validateInput(checked, body);
  if (operation.id === 'incidents.status' && context) {
    if (!incidentTransitions(context).includes(body.status as 'acknowledged' | 'closed'))
      errors.push('Báo cáo chưa đủ điều kiện chuyển trạng thái. Tải lại hồ sơ.');
    if (body.status === 'closed' && String(body.note ?? '').trim().length < 3)
      errors.push('Nhập ghi chú xử lý tối thiểu 3 ký tự.');
  }
  if (operation.id === 'schedules.complete') {
    const medicated = ['vaccination', 'deworming'].includes(String(context?.type));
    const administration = asRecord(body.administration),
      issue = asRecord(body.stockIssue);
    if (medicated && (!body.administration || !body.stockIssue))
      errors.push('Chọn thuốc từ tủ, nhập liều và ngày thực hiện.');
    if (!medicated && context && (body.administration || body.stockIssue))
      errors.push('Loại chăm sóc này không xuất thuốc từ lịch.');
    const performed = String(administration.performedOn ?? clubDate());
    if (medicated && (performed < String(context?.dueDate ?? '') || performed > clubDate()))
      errors.push('Ngày thực hiện phải từ ngày hẹn đến hôm nay.');
    if (
      body.nextDueDate &&
      (context?.type === 'follow_up' ||
        String(body.nextDueDate) <= performed ||
        String(body.nextDueDate) < clubDate())
    )
      errors.push('Ngày hẹn tiếp theo phải sau ngày thực hiện và từ hôm nay trở đi.');
    if (medicated) {
      const cabinet = asRecord(context?._cabinet),
        warehouse = asRecord(cabinet.warehouse);
      const item = (Array.isArray(cabinet.items) ? cabinet.items.map(asRecord) : []).find(
        (row) => entityId(row) === entityId(issue.itemId),
      );
      if (
        !item ||
        !warehouse._id ||
        issue.warehouseId !== warehouse._id ||
        issue.stockVersion !== warehouse.stockVersion
      )
        errors.push('Tải lại tủ thuốc và chọn thuốc còn khả dụng.');
      else if (
        Number(issue.quantity) > Number(item.available) ||
        Math.abs(Number(issue.quantity) * 1000 - Math.round(Number(issue.quantity) * 1000)) >=
          1e-7 ||
        (item.unit === 'piece' && !Number.isInteger(Number(issue.quantity)))
      )
        errors.push('Lượng xuất phải phù hợp tồn tủ và đơn vị thuốc.');
    }
  }
  if (operation.id === 'prescriptions.issue' && context && Array.isArray(context.lines)) {
    const expected = context.lines
      .map(asRecord)
      .filter(
        (line) => Number(line.remaining ?? Number(line.quantity) - Number(line.supplied ?? 0)) > 0,
      );
    const supplied = Array.isArray(body.lines) ? body.lines.map(asRecord) : [];
    if (
      expected.length !== supplied.length ||
      expected.some(
        (line) =>
          !supplied.some(
            (value) =>
              value.lineId === line._id &&
              Number(value.quantity) ===
                Number(line.remaining ?? Number(line.quantity) - Number(line.supplied ?? 0)),
          ),
      )
    )
      errors.push('Cần xuất đủ toàn bộ lượng còn lại của đơn trong một lần.');
  }
  if (
    operation.module === 'warehouses' &&
    body.type === 'medicine_cabinet' &&
    !body.responsibleVetId
  )
    errors.push('Tủ thuốc cần chọn bác sĩ phụ trách chính.');
  const requireFields = (keys: string[], message: string) => {
    if (keys.some((key) => body[key] === undefined || body[key] === null || body[key] === ''))
      errors.push(message);
  };
  if (operation.id === 'admissions.groom' && body.decision === 'approve') {
    requireFields(['stallId'], 'Chọn ô cách ly tiếp nhận.');
    if (body.identityChecked !== true) errors.push('Cần xác nhận đã đối chiếu nhận dạng thực tế.');
  }
  if (operation.id === 'admissions.vet' && body.decision === 'approve')
    requireFields(
      ['examinationDate', 'diagnosis', 'quarantineReleaseAt', 'weight', 'height'],
      'Duyệt thú y cần thời điểm khám, chẩn đoán, hết cách ly và số đo cân nặng/chiều cao.',
    );
  if (operation.id === 'admissions.trainer' && body.decision === 'approve')
    requireFields(['score', 'readiness'], 'Duyệt đánh giá cần điểm và mức sẵn sàng.');
  if (operation.id === 'admissions.decide' && body.decision === 'approve')
    requireFields(['stallId', 'trainerId'], 'Chọn ô chuồng và HLV phụ trách.');
  if (body.validFrom && body.validTo && String(body.validFrom) > String(body.validTo))
    errors.push('Ngày kết thúc không được trước ngày bắt đầu.');
  if (
    body.startDate &&
    body.endDate &&
    Date.parse(String(body.startDate)) > Date.parse(String(body.endDate))
  )
    errors.push('Ngày kết thúc không được trước ngày bắt đầu.');
  for (const key of ['examinationDate', 'injuryDate', 'observedAt'])
    if (body[key] && Date.parse(String(body[key])) > Date.now())
      errors.push('Thời điểm ghi nhận không được ở tương lai.');
  if (
    body.quarantineReleaseAt &&
    body.examinationDate &&
    Date.parse(String(body.quarantineReleaseAt)) < Date.parse(String(body.examinationDate))
  )
    errors.push('Hết cách ly không được trước thời điểm khám.');

  if (operation.id === 'disposals.decision' && body.status === 'confirmed' && !body.handling)
    errors.push('Chọn cách xử lý vật tư.');
  if (operation.id === 'medical.encounter' && body.injury && body.injuries)
    errors.push('Chọn một trong ghi nhận chấn thương đơn lẻ hoặc danh sách chấn thương.');
  if (
    Array.isArray(body.meals) &&
    new Set(body.meals.map((row) => asRecord(row).key)).size !== body.meals.length
  )
    errors.push('Mã các bữa ăn phải khác nhau.');
  if (operation.id === 'sessions.override' && String(body.overrideReason ?? '').trim().length < 5)
    errors.push('Lý do hiệu chỉnh cần ít nhất 5 ký tự.');
  if (operation.contract === 'incident.create') {
    if (['horseId', 'stallId', 'stableId', 'warehouseId'].filter((key) => body[key]).length !== 1)
      errors.push('Chọn đúng một đối tượng: ngựa, ô chuồng, khu chuồng hoặc kho.');
    if (body.taskImpact && body.taskImpact !== 'none' && !body.taskId)
      errors.push('Chọn công việc đang bị ảnh hưởng.');
  }
  if (
    operation.contract === 'replenishment.create' &&
    Boolean(body.taskId) === Boolean(body.warehouseId)
  )
    errors.push('Chọn một công việc hoặc một kho cần bổ sung.');
  if (operation.contract === 'inventory.itemCreate' && body.category === 'medicine')
    requireFields(['strength', 'dosageForm'], 'Thuốc phải có hàm lượng và dạng thuốc.');
  if (
    operation.contract.includes('transfer') &&
    body.sourceWarehouseId === body.destinationWarehouseId
  )
    errors.push('Kho nguồn và kho đích phải khác nhau.');
  if (operation.contract === 'medicalEncounter.encounterSchema') {
    if (body.injury && body.injuries)
      errors.push('Chọn chấn thương đơn lẻ hoặc danh sách chấn thương.');
    const record = asRecord(body.record);
    if (Date.parse(String(record.examinationDate)) > Date.now())
      errors.push('Thời điểm khám không được ở tương lai.');
    if (
      body.completeSchedule &&
      (record.type !== 'follow_up' || !String(record.diagnosis ?? '').trim())
    )
      errors.push('Kết thúc tái khám cần chọn loại Tái khám và nhập kết luận.');
  }
  if (
    body.avgHeartRate !== undefined &&
    body.maxHeartRate !== undefined &&
    Number(body.avgHeartRate) > Number(body.maxHeartRate)
  )
    errors.push('Nhịp tim trung bình không được vượt nhịp tim tối đa.');
  if (['schedules.create', 'schedules.edit'].includes(operation.id)) {
    if (String(body.dueDate ?? '') < clubDate()) errors.push('Ngày hẹn phải từ hôm nay trở đi.');
    if (body.startTime && body.endTime) {
      const minutes = (value: unknown) => {
        const parts = String(value).split(':').map(Number);
        return parts[0] * 60 + parts[1];
      };
      const duration = minutes(body.endTime) - minutes(body.startTime);
      if (duration <= 0) errors.push('Giờ kết thúc khám phải sau giờ bắt đầu.');
      if (duration > 720) errors.push('Khung khám tối đa 12 giờ trong ngày.');
    }
  }
  if (operation.module === 'rations' && Array.isArray(body.meals)) {
    for (const value of body.meals) {
      const meal = asRecord(value),
        lines = Array.isArray(meal.lines) ? meal.lines.map(asRecord) : [];
      if (new Set(lines.map((line) => entityId(line.itemId))).size !== lines.length)
        errors.push('Không lặp vật tư trong cùng một bữa ăn.');
      if (
        lines.some(
          (line) =>
            Math.abs(Number(line.quantity) * 1000 - Math.round(Number(line.quantity) * 1000)) >=
            1e-7,
        )
      )
        errors.push('Lượng thức ăn chỉ nhận tối đa 3 chữ số thập phân.');
    }
  }
  if (operation.id === 'tasks.bulk' && Array.isArray(body.tasks))
    body.tasks.forEach((value, index) => {
      const task = asRecord(value),
        label = 'Công việc ' + (index + 1) + ': ';
      if (Date.parse(String(task.scheduledEndAt)) <= Date.parse(String(task.scheduledStartAt)))
        errors.push(label + 'Giờ kết thúc phải sau giờ bắt đầu.');
      if (
        task.type === 'stall_cleaning'
          ? !task.stallId || task.horseId || task.trainingPlanId
          : !task.horseId ||
            task.stallId ||
            (task.type === 'training' ? !task.trainingPlanId : task.trainingPlanId)
      )
        errors.push(label + 'Chọn đúng ngựa/ô và giáo án cho loại công việc.');
      if (
        task.type === 'feeding'
          ? !task.rationPlanId || !task.rationMealKey
          : task.rationPlanId || task.rationMealKey
      )
        errors.push(label + 'Cho ăn cần khẩu phần và bữa ăn; loại khác không dùng khẩu phần.');
      if (
        task.type !== 'training' &&
        (task.trainingExerciseKey !== undefined || task.trainingPlanRevision !== undefined)
      )
        errors.push(label + 'Chỉ lịch tập nhận bài tập/phiên bản giáo án.');
    });
  return [...new Set(errors)];
}
