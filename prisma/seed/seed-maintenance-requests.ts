import {
  MaintenanceHistoryAction as Action,
  MaintenancePriority as Priority,
  MaintenanceStatus as Status,
} from '../../src/generated/prisma/enums.js';
import type { Prisma } from '../../src/generated/prisma/client.js';
import {
  adminMessages,
  categoryCatalog,
  diagnoses,
  feedbackMessages,
  partsByCategory,
  repairs,
  requestTemplates,
  residentMessages,
  technicianMessages,
  urgentTitles,
} from './seed-catalog.js';
import type { SeedData } from './seed-types.js';
import { after, DAY, HOUR, id, Random } from './seed-utils.js';

const counts = [28, 37, 31, 43, 38, 43]; // 220, nonuniform historical volume

export function maintenance(
  data: SeedData,
  start: Date,
  end: Date,
  random: Random,
): void {
  const eligibleTechnicians = data.technicians.filter(
    (technician) => technician.isActive && technician.isAvailable,
  );
  const activeResidents = data.residents.filter(
    (resident) =>
      resident.isActive &&
      data.users.find((user) => user.id === resident.userId)?.isActive,
  );
  const cutoff = after(end, -10 * DAY);
  let index = 0;
  for (let bucket = 0; bucket < counts.length; bucket++) {
    for (let position = 0; position < counts[bucket]; position++, index++) {
      let status: Status =
        random.next() < 0.065 ? Status.CANCELLED : Status.CLOSED;
      let createdAt = new Date(
        start.getTime() +
          ((bucket + random.next()) / 6) * (cutoff.getTime() - start.getTime()),
      );
      if (index >= 190) {
        status =
          index < 200
            ? Status.OPEN
            : index < 210
              ? Status.ASSIGNED
              : Status.IN_PROGRESS;
        createdAt = after(end, -(random.int(6, 68) * HOUR));
      } else if (index >= 182) {
        status = Status.RESOLVED;
        createdAt = after(end, -(random.int(5, 9) * DAY));
      } else if (index >= 174 && status === Status.CLOSED) {
        // Recent completions as well as pending jobs keep current-month reports useful.
        createdAt = after(end, -(10 + (index % 3)) * DAY);
      }
      const historical = createdAt < after(end, -21 * DAY);
      const resident = random.pick(
        historical ? data.residents : activeResidents,
      );
      const categoryIndex = random.weighted(
        categoryCatalog.map(
          ([, , weight], category) =>
            [category, !historical && category >= 8 ? 0 : weight] as const,
        ),
      );
      const category = data.categories[categoryIndex];
      let priority = random.weighted([
        [Priority.LOW, 15],
        [Priority.MEDIUM, 45],
        [Priority.HIGH, 30],
        [Priority.URGENT, 10],
      ]);
      if (index === 182) priority = Priority.URGENT;
      const title =
        priority === Priority.URGENT
          ? urgentTitles[categoryIndex]
          : random.pick(requestTemplates[categoryIndex]);
      const requestId = id('request', index);
      const admin = data.users[index % 2];
      let lastUpdated = createdAt;
      const event = (
        action: Action,
        at: Date,
        userId: string | null,
        oldValue?: string | null,
        newValue?: string | null,
        metadata?: Prisma.InputJsonValue,
      ): void => {
        data.history.push({
          id: id('history', data.history.length),
          maintenanceRequestId: requestId,
          userId,
          action,
          oldValue,
          newValue,
          metadata,
          createdAt: at,
        });
      };
      const transition = (
        oldValue: Status,
        newValue: Status,
        at: Date,
        actor: string,
      ): void => {
        event(Action.STATUS_CHANGED, at, actor, oldValue, newValue);
        lastUpdated = at;
      };
      const comment = (message: string, at: Date, actor: string): void => {
        if (at > end) return;
        const commentId = id('comment', data.comments.length);
        data.comments.push({
          id: commentId,
          maintenanceRequestId: requestId,
          userId: actor,
          message,
          createdAt: at,
          updatedAt: at,
        });
        event(Action.COMMENT_ADDED, at, actor, undefined, commentId);
      };
      event(Action.REQUEST_CREATED, createdAt, resident.userId);
      // Edits are only legal while OPEN, before assignment. No redundant REQUEST_UPDATED.
      if (index % 13 === 0) {
        const oldPriority =
          priority === Priority.LOW ? Priority.MEDIUM : Priority.LOW;
        const at = after(createdAt, 5 * 60_000);
        event(
          Action.PRIORITY_CHANGED,
          at,
          resident.userId,
          oldPriority,
          priority,
        );
        lastUpdated = at;
      }
      if (index % 19 === 0) {
        const previous = data.categories[(categoryIndex + 1) % 8];
        const at = after(createdAt, 8 * 60_000);
        event(
          Action.CATEGORY_CHANGED,
          at,
          admin.id!,
          previous.id,
          category.id,
          { previousCategoryName: previous.name, categoryName: category.name },
        );
        lastUpdated = at;
      }
      if (random.next() < 0.7)
        comment(
          random.pick(residentMessages),
          after(createdAt, 10 * 60_000),
          resident.userId,
        );
      let resolvedAt: Date | null = null;
      let closedAt: Date | null = null;
      if (status === Status.CANCELLED) {
        transition(
          Status.OPEN,
          Status.CANCELLED,
          after(createdAt, random.int(2, 18) * HOUR),
          resident.userId,
        );
      } else if (status !== Status.OPEN) {
        const candidates = eligibleTechnicians.filter((technician) =>
          data.skills.some(
            (skill) =>
              skill.technicianId === technician.id &&
              skill.categoryId === category.id,
          ),
        );
        const first = random.pick(candidates);
        let technician = first;
        const assignedAt = after(
          createdAt,
          (priority === Priority.URGENT ? 0.5 : random.int(1, 4)) * HOUR,
        );
        let finalAssignedAt = assignedAt;
        const makeAssignment = (
          tech: typeof first,
          at: Date,
          unassignedAt: Date | null,
        ): void => {
          data.assignments.push({
            id: id('assignment', data.assignments.length),
            maintenanceRequestId: requestId,
            technicianId: tech.id!,
            assignedByUserId: admin.id!,
            assignedAt: at,
            unassignedAt,
            isActive: unassignedAt === null,
            createdAt: at,
            updatedAt: unassignedAt ?? at,
          });
        };
        event(
          Action.TECHNICIAN_ASSIGNED,
          assignedAt,
          admin.id!,
          null,
          first.id,
          {
            technicianName: data.users.find((user) => user.id === first.userId)!
              .name,
          },
        );
        transition(Status.OPEN, Status.ASSIGNED, assignedAt, admin.id!);
        if (candidates.length > 1 && random.next() < 0.16) {
          technician = random.pick(
            candidates.filter((candidate) => candidate.id !== first.id),
          );
          finalAssignedAt = after(assignedAt, 20 * 60_000);
          makeAssignment(first, assignedAt, finalAssignedAt);
          event(
            Action.TECHNICIAN_REASSIGNED,
            finalAssignedAt,
            admin.id!,
            first.id,
            technician.id,
            {
              previousTechnicianName: data.users.find(
                (user) => user.id === first.userId,
              )!.name,
              technicianName: data.users.find(
                (user) => user.id === technician.userId,
              )!.name,
            },
          );
          lastUpdated = finalAssignedAt;
        }
        makeAssignment(technician, finalAssignedAt, null);
        if (random.next() < 0.65)
          comment(
            random.pick(adminMessages),
            after(finalAssignedAt, 5 * 60_000),
            admin.id!,
          );
        if (status !== Status.ASSIGNED) {
          const startedAt = after(finalAssignedAt, 30 * 60_000);
          transition(
            Status.ASSIGNED,
            Status.IN_PROGRESS,
            startedAt,
            technician.userId,
          );
          const noteAt = after(startedAt, 15 * 60_000);
          const noteId = id('note', data.notes.length);
          const labor =
            priority === Priority.URGENT
              ? random.int(8, 28) * 100
              : random.int(2, 18) * 100;
          const other = random.next() < 0.55 ? 0 : random.int(1, 8) * 100;
          data.notes.push({
            id: noteId,
            maintenanceRequestId: requestId,
            technicianId: technician.id!,
            diagnosis: diagnoses[categoryIndex],
            workPerformed:
              status === Status.IN_PROGRESS
                ? 'Inspection complete; repair and functional checks are underway.'
                : repairs[categoryIndex],
            laborCost: labor,
            otherCost: other,
            createdAt: noteAt,
            updatedAt: noteAt,
          });
          event(
            Action.WORK_NOTE_CREATED,
            noteAt,
            technician.userId,
            undefined,
            noteId,
          );
          const possibleParts = partsByCategory[categoryIndex];
          if (random.next() < 0.85) {
            const selected = new Set<number>();
            for (let slot = 0, slots = random.int(1, 2); slot < slots; slot++)
              selected.add(random.pick(possibleParts));
            for (const partIndex of selected) {
              const part = data.parts[partIndex];
              const at = after(noteAt, ((data.usages.length % 3) + 1) * 60_000);
              const usageId = id('usage', data.usages.length);
              const quantity = [1, 7, 15].includes(partIndex)
                ? random.int(1, 3)
                : 1;
              data.usages.push({
                id: usageId,
                maintenanceRequestId: requestId,
                partId: part.id!,
                quantity,
                unitPrice: Number(part.unitPrice),
                createdAt: at,
              });
              event(
                Action.PART_ADDED,
                at,
                technician.userId,
                undefined,
                usageId,
                { partId: part.id!, partName: part.name, quantity },
              );
            }
          }
          if (random.next() < 0.8)
            comment(
              random.pick(technicianMessages.slice(0, 3)),
              after(noteAt, 10 * 60_000),
              technician.userId,
            );
          if (random.next() < 0.45)
            comment(
              'Technician has arrived and access has been provided.',
              after(startedAt, 5 * 60_000),
              resident.userId,
            );
          if (status !== Status.IN_PROGRESS) {
            const durationHours =
              priority === Priority.URGENT
                ? random.int(3, 22)
                : priority === Priority.HIGH
                  ? random.int(12, 44)
                  : priority === Priority.MEDIUM
                    ? random.int(24, 90)
                    : random.int(48, 156);
            resolvedAt = after(startedAt, durationHours * HOUR);
            if (index === 182) {
              // Guaranteed current-day resolution, even when seeding near UTC midnight.
              const midnight = new Date(end);
              midnight.setUTCHours(0, 0, 0, 0);
              resolvedAt = new Date(
                midnight.getTime() + (end.getTime() - midnight.getTime()) / 2,
              );
            }
            transition(
              Status.IN_PROGRESS,
              Status.RESOLVED,
              resolvedAt,
              technician.userId,
            );
            if (random.next() < 0.6)
              comment(
                'Functional checks passed; please confirm the repair.',
                after(resolvedAt, 5 * 60_000),
                technician.userId,
              );
            if (status === Status.CLOSED) {
              closedAt = after(resolvedAt, random.int(3, 36) * HOUR);
              transition(
                Status.RESOLVED,
                Status.CLOSED,
                closedAt,
                resident.userId,
              );
              if (random.next() < 0.72) {
                const at = after(closedAt, random.int(1, 20) * HOUR);
                const rating = random.weighted([
                  [1, 2],
                  [2, 5],
                  [3, 13],
                  [4, 35],
                  [5, 45],
                ]);
                data.feedback.push({
                  id: id('feedback', data.feedback.length),
                  maintenanceRequestId: requestId,
                  residentId: resident.id!,
                  rating,
                  comment:
                    random.next() < 0.12
                      ? null
                      : feedbackMessages[
                          rating >= 4
                            ? random.int(0, 1)
                            : rating === 3
                              ? 2
                              : rating === 2
                                ? 3
                                : 4
                        ],
                  createdAt: at,
                  updatedAt: at,
                });
                event(
                  Action.FEEDBACK_SUBMITTED,
                  at,
                  resident.userId,
                  undefined,
                  undefined,
                  { rating },
                );
              }
            }
          } else {
            lastUpdated = noteAt;
          }
        }
      }
      data.requests.push({
        id: requestId,
        residentId: resident.id!,
        apartmentId: resident.apartmentId,
        categoryId: category.id!,
        title,
        description: `${title}. The resident reports recurring symptoms near ${data.apartments.find((apartment) => apartment.id === resident.apartmentId)!.block}-${data.apartments.find((apartment) => apartment.id === resident.apartmentId)!.unitNumber}. Please inspect the affected fitting, identify the cause and carry out a safe repair.`,
        priority,
        status,
        createdAt,
        updatedAt: lastUpdated,
        resolvedAt,
        closedAt,
      });
    }
  }
}
