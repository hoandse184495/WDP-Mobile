import { SurfaceLocationField } from '@/features/medical/components/surface-location-field';
import { StallDetails } from '@/features/stables/components/stall-details';
import { SessionDetails } from '@/features/training/components/session-details';
import { Card } from '@/shared/components/ui';
import { AdmissionDocuments } from '@/features/admissions/components/admission-documents';
import { StableMap } from '@/features/stables/components/stable-map';
import { ResponseSummary } from '@/features/operations/components/response-summary';
import { JsonRecord, asRecord, entityId } from '@/features/operations/types/operation';
export function RecordExtras({ module, record }: { module: string; record: JsonRecord }) {
  const details = asRecord(record._details);
  return (
    <>
      {['medical', 'injuries', 'schedules'].includes(module) && (
        <Card>
          <ResponseSummary
            data={{
              symptoms: record.symptoms,
              medications: record.medications,
              injuryVisits: record.injuryVisits,
              treatmentPlan: record.treatmentPlan,
              resolvedNotes: record.resolvedNotes,
              result: record.result,
              administration: record.administration,
              medicineIssue:
                typeof record.medicineIssueId === 'object' ? record.medicineIssueId : undefined,
              nextDueDate: record.nextDueDate,
              coordinationStatus: record.coordinationStatus,
              startTime: record.startTime,
              endTime: record.endTime,
              location: record.location,
              groom: record.groomId,
            }}
          />
        </Card>
      )}
      {module === 'injuries' && !!record.surfaceLocation && (
        <SurfaceLocationField
          value={record.surfaceLocation}
          horseId={entityId(record.horseId)}
          editable={false}
        />
      )}
      {module === 'admissions' && (
        <>
          <AdmissionDocuments record={record} />
          <Card>
            <ResponseSummary
              data={{
                reviews: record.reviews,
                departurePlan: record.departurePlan,
                departureState: record.departureState,
                candidateHorse: details.candidateHorse,
              }}
            />
          </Card>
        </>
      )}
      {module === 'stables' && <StableMap record={record} />}
      {module === 'stalls' && <StallDetails record={record} />}
      {module === 'sessions' && <SessionDetails record={record} />}
      {module === 'prescriptions' && (
        <Card>
          <ResponseSummary
            data={{
              prescription: record.prescription,
              recipient: details.recipient,
              warehouse: details.warehouse,
              available: details.available,
              issues: details.issues,
            }}
          />
        </Card>
      )}
      {['stocktakes', 'replenishments', 'disposals', 'receipts', 'transfers'].includes(module) && (
        <Card>
          <ResponseSummary
            data={{
              lines: record.lines,
              reports: details.reports,
              transfers: details.transfers,
              demand: details.demand,
              summary: record.summary,
            }}
          />
        </Card>
      )}
      {module === 'incidents' && (
        <Card>
          <ResponseSummary
            data={{
              assignedVet: record.assignedVet,
              assignedTo: record.assignedTo,
              assignedToRole: record.assignedToRole,
              reportedBy: record.reportedBy,
              assignmentNote: record.assignmentNote,
              clinicalResult: record.clinicalResult,
              history: record.history,
              taskImpact: record.taskImpact,
            }}
          />
        </Card>
      )}
    </>
  );
}
