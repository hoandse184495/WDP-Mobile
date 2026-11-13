import type { CareJournal } from '@/features/horses/types/care-journal';
import { clubDate } from '@/core/utils/date';
export const horseId = 'a'.repeat(24),
  otherHorseId = 'b'.repeat(24);
export const scopedHorse = {
  _id: horseId,
  name: 'Thanh Phong',
  registrationCode: 'AP-206',
  breed: 'Thoroughbred',
  gender: 'stallion',
  dateOfBirth: '2021-03-15',
  fitnessScore: 80,
  healthStatus: 'monitoring',
  isTrainingLocked: true,
  trainingLockReason: 'Tạm khóa khẩn cấp: Khập khiễng (Chờ khám xác nhận)',
};
export function journalFixture(date = clubDate()): CareJournal {
  return {
    medicalRecords: [],
    medicalSchedules: [],
    horse: {
      _id: horseId,
      name: 'Thanh Phong',
      registrationCode: 'AP-206',
      stallNumber: 'A01',
      healthStatus: 'monitoring',
      isTrainingLocked: true,
      trainingLockReason: scopedHorse.trainingLockReason,
      assignedGroom: { fullName: 'Nguyễn Đạt' },
      trainer: { fullName: 'Quốc Huy' },
    },
    date,
    summary: {
      meals: { completed: 1, total: 3, lastMealTime: date + 'T01:00:00Z' },
      stallCleaning: { cleaned: false, cleanedAt: null },
      training: {
        completed: true,
        sessionCount: 1,
        totalDistance: 0,
        avgHeartRate: null,
        trainerName: 'Quốc Huy',
      },
      health: {
        status: 'monitoring',
        isLocked: true,
        lockReason: scopedHorse.trainingLockReason,
        temperature: 37.5,
        latestCheckupDate: date + 'T00:00:00Z',
      },
    },
    tasks: [
      {
        _id: 'task-feed',
        title: 'Bữa sáng',
        type: 'feeding',
        status: 'completed',
        scheduledStartAt: date + 'T00:00:00Z',
        actualEndAt: date + 'T01:00:00Z',
        groom: { fullName: 'Nguyễn Đạt' },
        feedingOutcome: 'normal',
        feedingSnapshot: { title: 'Khẩu phần thể lực', meal: { name: 'Bữa sáng' } },
        feedingLeftovers: [
          { name: 'Cỏ khô', unit: 'kg', quantity: 0, measurement: 'weighed', disposition: 'none' },
        ],
        completionNotes: 'Ăn hết khẩu phần theo ghi nhận',
        photos: [
          {
            _id: 'photo1',
            fileName: 'bua-sang.jpg',
            url: 'https://storage.example/evidence.jpg?signed=opaque',
          },
        ],
      },
      {
        _id: 'task-cancel',
        title: 'Vệ sinh ô dự phòng',
        type: 'stall_cleaning',
        status: 'cancelled',
        scheduledStartAt: date + 'T02:00:00Z',
        photos: [],
      },
    ],
    sessions: [
      {
        _id: 'session1',
        sessionDate: date + 'T03:00:00Z',
        status: 'completed',
        distanceCompleted: 0,
        durationMinutes: 0,
        avgSpeed: 0,
        maxSpeed: 0,
        avgHeartRate: null,
        maxHeartRate: null,
        performanceRating: null,
        trainer: { fullName: 'Quốc Huy' },
        trainerNotes: 'Ghi nhận tập hồi phục',
        plan: { title: 'Giáo án phục hồi' },
      },
    ],
  };
}
