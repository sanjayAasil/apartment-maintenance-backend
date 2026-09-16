import {
  MaintenanceHistoryAction as Action,
  MaintenanceStatus as Status,
  UserRole,
} from '../../src/generated/prisma/enums.js';
import type { SeedPlan } from './seed-types.js';

function check(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`Seed integrity: ${message}`);
}
function time(value: unknown): number {
  check(
    value instanceof Date && Number.isFinite(value.getTime()),
    'missing/invalid explicit timestamp',
  );
  return value.getTime();
}
export function validatePlan(plan: SeedPlan): void {
  const { data, end, openingStock } = plan;
  const unique = (values: unknown[], label: string): void =>
    check(new Set(values).size === values.length, `duplicate ${label}`);
  for (const [table, rows] of Object.entries(data)) {
    check(rows.length > 0, `${table} is not covered`);
    unique(
      rows.map((row: { id?: string }) => row.id),
      `${table} id`,
    );
    for (const row of rows) {
      check(time(row.createdAt) <= end.getTime(), `${table} future creation`);
      if ('updatedAt' in row)
        check(
          time(row.updatedAt) >= time(row.createdAt) &&
            time(row.updatedAt) <= end.getTime(),
          `${table} invalid update time`,
        );
    }
  }
  unique(
    data.users.map((row) => row.email.toLowerCase()),
    'email',
  );
  unique(
    data.apartments.map((row) => `${row.block}:${row.unitNumber}`),
    'apartment',
  );
  unique(
    data.categories.map((row) => row.name.toLowerCase()),
    'category',
  );
  unique(
    data.parts.map((row) => row.name.toLowerCase()),
    'part',
  );
  unique(
    data.residents.map((row) => row.userId),
    'resident user',
  );
  unique(
    data.technicians.map((row) => row.userId),
    'technician user',
  );
  unique(
    data.skills.map((row) => `${row.technicianId}:${row.categoryId}`),
    'skill',
  );
  unique(
    data.notes.map((row) => row.maintenanceRequestId),
    'work note',
  );
  unique(
    data.feedback.map((row) => row.maintenanceRequestId),
    'feedback',
  );
  const users = new Map(data.users.map((row) => [row.id, row]));
  const residents = new Map(data.residents.map((row) => [row.id, row]));
  const technicians = new Map(data.technicians.map((row) => [row.id, row]));
  const categories = new Map(data.categories.map((row) => [row.id, row]));
  const apartments = new Map(data.apartments.map((row) => [row.id, row]));
  const parts = new Map(data.parts.map((row) => [row.id, row]));
  const requests = new Map(data.requests.map((row) => [row.id, row]));
  for (const resident of data.residents) {
    check(
      users.get(resident.userId)?.role === UserRole.RESIDENT &&
        apartments.has(resident.apartmentId),
      'resident relations/role',
    );
    check(
      time(users.get(resident.userId)!.createdAt) <= time(resident.createdAt) &&
        time(resident.moveInDate) <= time(resident.createdAt),
      'resident registration/move-in chronology',
    );
  }
  for (const technician of data.technicians)
    check(
      users.get(technician.userId)?.role === UserRole.TECHNICIAN &&
        time(users.get(technician.userId)!.createdAt) <=
          time(technician.createdAt),
      'technician user',
    );
  for (const skill of data.skills)
    check(
      technicians.has(skill.technicianId) &&
        categories.has(skill.categoryId) &&
        time(skill.createdAt) >=
          time(technicians.get(skill.technicianId)!.createdAt),
      'skill relations/time',
    );
  for (const part of data.parts) {
    check(
      Number.isInteger(part.quantity) &&
        part.quantity! >= 0 &&
        Number(part.unitPrice) >= 0,
      'invalid stock/price',
    );
    const consumed = data.usages
      .filter((usage) => usage.partId === part.id)
      .reduce((sum, row) => sum + row.quantity, 0);
    check(
      openingStock[part.id!] - consumed === part.quantity,
      'inventory does not reconcile',
    );
  }
  for (const request of data.requests) {
    const resident = residents.get(request.residentId);
    check(
      resident &&
        resident.apartmentId === request.apartmentId &&
        categories.has(request.categoryId),
      'request relations/apartment mismatch',
    );
    check(
      time(request.createdAt) >= plan.start.getTime() &&
        time(request.createdAt) >= time(resident.createdAt),
      'request creation before profile/period',
    );
    const assignments = data.assignments
      .filter((row) => row.maintenanceRequestId === request.id)
      .sort((a, b) => time(a.assignedAt) - time(b.assignedAt));
    const active = assignments.filter((row) => row.isActive);
    const needsAssignment = ![Status.OPEN, Status.CANCELLED].includes(
      request.status as typeof Status.OPEN | typeof Status.CANCELLED,
    );
    check(
      active.length === (needsAssignment ? 1 : 0),
      'incorrect active assignment count',
    );
    for (let index = 0; index < assignments.length; index++) {
      const assignment = assignments[index];
      const technician = technicians.get(assignment.technicianId);
      check(
        technician &&
          users.get(assignment.assignedByUserId)?.role === UserRole.ADMIN,
        'assignment relations',
      );
      check(
        data.skills.some(
          (row) =>
            row.technicianId === technician.id &&
            row.categoryId === request.categoryId,
        ),
        'technician lacks skill',
      );
      check(
        technician.isActive &&
          technician.isAvailable &&
          users.get(technician.userId)?.isActive,
        'ineligible assigned technician',
      );
      check(
        time(assignment.assignedAt) > time(request.createdAt) &&
          time(assignment.createdAt) === time(assignment.assignedAt),
        'assignment chronology',
      );
      check(
        assignment.isActive
          ? assignment.unassignedAt === null
          : time(assignment.unassignedAt) > time(assignment.assignedAt),
        'assignment active/unassigned timestamp',
      );
      if (index > 0)
        check(
          time(assignments[index - 1].unassignedAt) <=
            time(assignment.assignedAt),
          'overlapping assignments',
        );
    }
    const history = data.history
      .filter((row) => row.maintenanceRequestId === request.id)
      .sort((a, b) => time(a.createdAt) - time(b.createdAt));
    check(
      history.filter((row) => row.action === Action.REQUEST_CREATED).length ===
        1 && time(history[0].createdAt) === time(request.createdAt),
      'creation history',
    );
    let status: string = Status.OPEN;
    const legal: Record<string, string[]> = {
      OPEN: ['ASSIGNED', 'CANCELLED'],
      ASSIGNED: ['IN_PROGRESS', 'CANCELLED', 'OPEN'],
      IN_PROGRESS: ['RESOLVED'],
      RESOLVED: ['CLOSED'],
      CLOSED: [],
      CANCELLED: [],
    };
    for (const entry of history) {
      check(entry.userId == null || users.has(entry.userId), 'history actor');
      check(
        time(entry.createdAt) >= time(request.createdAt),
        'history before request',
      );
      if (entry.action === Action.STATUS_CHANGED) {
        check(
          entry.oldValue === status && legal[status].includes(entry.newValue!),
          'contradictory status history',
        );
        status = entry.newValue!;
        if (status === Status.RESOLVED)
          check(
            time(entry.createdAt) === time(request.resolvedAt),
            'resolved history timestamp',
          );
        if (status === Status.CLOSED)
          check(
            time(entry.createdAt) === time(request.closedAt),
            'closed history timestamp',
          );
      }
    }
    check(status === request.status, 'history final state mismatch');
    for (let index = 0; index < assignments.length; index++) {
      const assignment = assignments[index];
      const action =
        index === 0 ? Action.TECHNICIAN_ASSIGNED : Action.TECHNICIAN_REASSIGNED;
      check(
        history.some(
          (entry) =>
            entry.action === action &&
            entry.newValue === assignment.technicianId &&
            time(entry.createdAt) === time(assignment.assignedAt) &&
            (index === 0 ||
              entry.oldValue === assignments[index - 1].technicianId),
        ),
        'missing/contradictory assignment history',
      );
    }
    const started = history.find(
      (row) =>
        row.action === Action.STATUS_CHANGED &&
        row.newValue === Status.IN_PROGRESS,
    );
    const complete =
      request.status === Status.CLOSED || request.status === Status.RESOLVED;
    check(
      complete
        ? time(request.resolvedAt) > time(started?.createdAt) &&
            time(request.resolvedAt) <= end.getTime()
        : request.resolvedAt === null,
      'resolved timestamp/status',
    );
    check(
      request.status === Status.CLOSED
        ? time(request.closedAt) > time(request.resolvedAt) &&
            time(request.closedAt) <= end.getTime()
        : request.closedAt === null,
      'closed timestamp/status',
    );
    for (const note of data.notes.filter(
      (row) => row.maintenanceRequestId === request.id,
    )) {
      check(
        started &&
          note.technicianId === active[0]?.technicianId &&
          time(note.createdAt) > time(started.createdAt) &&
          (!complete || time(note.createdAt) < time(request.resolvedAt)),
        'work note ownership/time',
      );
      check(
        Number(note.laborCost) >= 0 && Number(note.otherCost) >= 0,
        'negative cost',
      );
      check(
        history.some(
          (row) =>
            row.action === Action.WORK_NOTE_CREATED &&
            row.newValue === note.id &&
            time(row.createdAt) === time(note.createdAt),
        ),
        'missing work note history',
      );
    }
    for (const usage of data.usages.filter(
      (row) => row.maintenanceRequestId === request.id,
    )) {
      check(
        parts.has(usage.partId) &&
          started &&
          time(usage.createdAt) > time(started.createdAt) &&
          (!complete || time(usage.createdAt) < time(request.resolvedAt)),
        'part usage relation/time',
      );
      check(
        usage.quantity > 0 && Number(usage.unitPrice) >= 0,
        'invalid usage amount',
      );
      check(
        history.some(
          (row) =>
            row.action === Action.PART_ADDED && row.newValue === usage.id,
        ),
        'missing parts history',
      );
    }
    for (const comment of data.comments.filter(
      (row) => row.maintenanceRequestId === request.id,
    )) {
      const user = users.get(comment.userId);
      check(
        user &&
          comment.message.trim().length > 0 &&
          comment.message.length <= 2000 &&
          time(comment.createdAt) > time(request.createdAt),
        'comment relation/message/time',
      );
      check(
        user.isActive || time(comment.createdAt) < time(user.updatedAt),
        'comment after user deactivation',
      );
      if (user.role === UserRole.RESIDENT)
        check(user.id === resident.userId, 'unrelated resident comment');
      if (user.role === UserRole.TECHNICIAN)
        check(
          assignments.some(
            (row) =>
              technicians.get(row.technicianId)?.userId === user.id &&
              time(comment.createdAt) >= time(row.assignedAt) &&
              (row.unassignedAt === null ||
                time(comment.createdAt) < time(row.unassignedAt)),
          ),
          'unassigned technician comment',
        );
      check(
        history.some(
          (row) =>
            row.action === Action.COMMENT_ADDED && row.newValue === comment.id,
        ),
        'missing comment history',
      );
    }
    for (const feedback of data.feedback.filter(
      (row) => row.maintenanceRequestId === request.id,
    )) {
      check(
        request.status === Status.CLOSED &&
          feedback.residentId === request.residentId &&
          time(feedback.createdAt) > time(request.closedAt),
        'feedback ownership/eligibility/time',
      );
      check(
        Number.isInteger(feedback.rating) &&
          feedback.rating >= 1 &&
          feedback.rating <= 5,
        'feedback rating',
      );
      check(
        history.some(
          (row) =>
            row.action === Action.FEEDBACK_SUBMITTED &&
            time(row.createdAt) === time(feedback.createdAt),
        ),
        'missing feedback history',
      );
    }
  }
  for (const rows of [
    data.assignments,
    data.comments,
    data.history,
    data.notes,
    data.usages,
    data.feedback,
  ])
    for (const row of rows)
      check(requests.has(row.maintenanceRequestId), 'orphan request child');
  for (const status of Object.values(Status))
    check(
      data.requests.some((row) => row.status === status),
      `missing ${status} test coverage`,
    );
  for (const category of data.categories.filter((row) => row.isActive))
    check(
      data.skills.some(
        (row) =>
          row.categoryId === category.id &&
          technicians.get(row.technicianId)?.isAvailable &&
          technicians.get(row.technicianId)?.isActive,
      ),
      'active category without available coverage',
    );
}
