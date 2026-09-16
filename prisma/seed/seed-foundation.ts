import { UserRole } from '../../src/generated/prisma/enums.js';
import {
  categoryCatalog,
  firstNames,
  partCatalog,
  skillGroups,
  surnames,
} from './seed-catalog.js';
import type { SeedData } from './seed-types.js';
import { after, DAY, id, Random } from './seed-utils.js';

export function foundation(
  start: Date,
  end: Date,
  passwordHash: string,
  random: Random,
): SeedData {
  const data: SeedData = {
    users: [],
    apartments: [],
    residents: [],
    categories: [],
    technicians: [],
    skills: [],
    parts: [],
    requests: [],
    assignments: [],
    comments: [],
    history: [],
    notes: [],
    usages: [],
    feedback: [],
  };
  const base = after(start, -30 * DAY);
  const inactiveAt = after(end, -7 * DAY);
  for (const [role, count, prefix] of [
    [UserRole.ADMIN, 2, 'admin'],
    [UserRole.RESIDENT, 45, 'resident'],
    [UserRole.TECHNICIAN, 13, 'technician'],
  ] as const) {
    for (let index = 0; index < count; index++) {
      const isActive =
        !(role === UserRole.RESIDENT && index >= 42) &&
        !(role === UserRole.TECHNICIAN && index === 12);
      const createdAt = after(base, -random.int(0, 90) * DAY);
      const userId = id(prefix, index);
      data.users.push({
        id: userId,
        name: `${firstNames[(index + (role === UserRole.TECHNICIAN ? 10 : 0)) % firstNames.length]} ${surnames[index % surnames.length]}`,
        email: `${prefix}${index + 1}@example.com`,
        passwordHash,
        role,
        isActive,
        createdAt,
        updatedAt: isActive ? createdAt : inactiveAt,
      });
    }
  }
  for (let block = 0; block < 4; block++) {
    for (let floor = 1; floor <= 4; floor++) {
      for (let unit = 1; unit <= 3; unit++) {
        const index = data.apartments.length;
        const createdAt = after(base, -180 * DAY - index * DAY);
        data.apartments.push({
          id: id('apartment', index),
          block: 'ABCD'[block],
          floor,
          unitNumber: `${floor}0${unit}`,
          createdAt,
          updatedAt: createdAt,
        });
      }
    }
  }
  for (let index = 0; index < 45; index++) {
    // 35 occupied units, 10 second household members, 13 vacant units.
    const createdAt = after(base, random.int(1, 10) * DAY);
    const isActive = index < 41;
    data.residents.push({
      id: id('resident-profile', index),
      userId: id('resident', index),
      apartmentId: data.apartments[index % 35].id!,
      phone: `90000${String(index + 1).padStart(5, '0')}`,
      moveInDate: after(createdAt, -random.int(1, 600) * DAY),
      isActive,
      createdAt,
      updatedAt: isActive ? createdAt : inactiveAt,
    });
  }
  categoryCatalog.forEach(([name, description], index) => {
    const createdAt = after(base, -15 * DAY);
    data.categories.push({
      id: id('category', index),
      name,
      description,
      isActive: index < 8,
      createdAt,
      updatedAt: index < 8 ? createdAt : inactiveAt,
    });
  });
  for (let index = 0; index < 13; index++) {
    const createdAt = after(base, 12 * DAY);
    data.technicians.push({
      id: id('technician-profile', index),
      userId: id('technician', index),
      phone: `90001${String(index + 1).padStart(5, '0')}`,
      experienceYears: random.int(1, 14),
      isAvailable: ![3, 8, 11, 12].includes(index),
      isActive: index !== 12,
      createdAt,
      updatedAt: index === 12 ? inactiveAt : after(end, -DAY),
    });
    for (const categoryIndex of skillGroups[index]) {
      data.skills.push({
        id: id('skill', data.skills.length),
        technicianId: id('technician-profile', index),
        categoryId: id('category', categoryIndex),
        createdAt,
      });
    }
  }
  partCatalog.forEach(([name, price, minimumStock], index) => {
    const createdAt = after(base, -10 * DAY);
    data.parts.push({
      id: id('part', index),
      name,
      description: `${name} — sample maintenance-store item`,
      quantity:
        index < 2
          ? 0
          : index < 8
            ? random.int(1, minimumStock)
            : random.int(minimumStock + 10, minimumStock + 50),
      unitPrice: price,
      minimumStock,
      isActive: index < 23,
      createdAt,
      updatedAt: index < 23 ? after(end, -DAY) : inactiveAt,
    });
  });
  return data;
}
