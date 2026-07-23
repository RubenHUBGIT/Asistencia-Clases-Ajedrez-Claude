import { PrismaClient, AttendanceStatus, PaymentStatus, PaymentMethod } from '@prisma/client';
import { addDays, startOfWeek, subWeeks, subMonths } from 'date-fns';
import { hashPassword } from '../src/lib/password';
import {
  PERMISSIONS,
  DEFAULT_ROLE_PERMISSIONS,
  ROLE_DEFINITIONS,
  ROLE_KEYS,
} from '../src/lib/permissions';

const prisma = new PrismaClient();

function weekdayDate(weekReference: Date, weekday: number): Date {
  // weekday: 1 = lunes ... 7 = domingo (formato ISO usado en el resto de la app)
  const monday = startOfWeek(weekReference, { weekStartsOn: 1 });
  return addDays(monday, weekday - 1);
}

async function upsertPermissionsAndRoles() {
  for (const permission of PERMISSIONS) {
    await prisma.permission.upsert({
      where: { key: permission.key },
      update: { description: permission.description },
      create: { key: permission.key, description: permission.description },
    });
  }

  for (const roleKey of Object.values(ROLE_KEYS)) {
    const definition = ROLE_DEFINITIONS[roleKey];
    const role = await prisma.role.upsert({
      where: { key: roleKey },
      update: { name: definition.name, description: definition.description },
      create: { key: roleKey, name: definition.name, description: definition.description },
    });

    const permissionKeys = DEFAULT_ROLE_PERMISSIONS[roleKey];
    const permissions = await prisma.permission.findMany({
      where: { key: { in: permissionKeys } },
    });

    await prisma.rolePermission.deleteMany({ where: { roleId: role.id } });
    await prisma.rolePermission.createMany({
      data: permissions.map((permission) => ({ roleId: role.id, permissionId: permission.id })),
      skipDuplicates: true,
    });
  }
}

async function upsertUserWithRole(params: {
  email: string;
  username: string;
  name: string;
  password: string;
  roleKey: keyof typeof ROLE_KEYS;
  mustChangePassword: boolean;
}) {
  const passwordHash = await hashPassword(params.password);
  const role = await prisma.role.findUniqueOrThrow({ where: { key: params.roleKey } });

  const user = await prisma.user.upsert({
    where: { email: params.email },
    update: {
      username: params.username,
      name: params.name,
      passwordHash,
      isActive: true,
      mustChangePassword: params.mustChangePassword,
    },
    create: {
      email: params.email,
      username: params.username,
      name: params.name,
      passwordHash,
      isActive: true,
      mustChangePassword: params.mustChangePassword,
    },
  });

  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: user.id, roleId: role.id } },
    update: {},
    create: { userId: user.id, roleId: role.id },
  });

  return user;
}

async function main() {
  console.log('Sembrando permisos y roles...');
  await upsertPermissionsAndRoles();

  const adminEmail = process.env.ADMIN_EMAIL ?? 'admin@example.com';
  const adminUsername = process.env.ADMIN_USERNAME ?? 'admin';
  const adminPassword = process.env.ADMIN_PASSWORD ?? 'CambiaEstaClave123!';

  console.log(`Sembrando usuario administrador (${adminEmail})...`);
  const admin = await upsertUserWithRole({
    email: adminEmail,
    username: adminUsername,
    name: 'Administrador',
    password: adminPassword,
    roleKey: 'ADMIN',
    mustChangePassword: true,
  });

  console.log('Sembrando colegios...');
  const schoolAlpha = await prisma.school.upsert({
    where: { id: 'seed-school-alpha' },
    update: {},
    create: {
      id: 'seed-school-alpha',
      name: 'CEIP Federico García Lorca',
      address: 'Calle Alcalá 120',
      locality: 'Madrid',
      contactName: 'Marisol Pérez',
      contactPhone: '600111222',
      contactEmail: 'direccion@ceiplorca.example.com',
      notes: 'Clases en el gimnasio del colegio.',
    },
  });

  const schoolBeta = await prisma.school.upsert({
    where: { id: 'seed-school-beta' },
    update: {},
    create: {
      id: 'seed-school-beta',
      name: 'IES Miguel de Cervantes',
      address: 'Avenida de la Constitución 45',
      locality: 'Aranjuez',
      contactName: 'Javier Molina',
      contactPhone: '600333444',
      contactEmail: 'secretaria@iescervantes.example.com',
      notes: null,
    },
  });

  console.log('Sembrando grupos...');
  const groupsAlpha = await Promise.all([
    prisma.classGroup.upsert({
      where: { schoolId_name: { schoolId: schoolAlpha.id, name: 'General' } },
      update: {},
      create: { schoolId: schoolAlpha.id, name: 'General', isDefault: true, weekday: 2 },
    }),
    prisma.classGroup.upsert({
      where: { schoolId_name: { schoolId: schoolAlpha.id, name: 'Iniciación' } },
      update: {},
      create: { schoolId: schoolAlpha.id, name: 'Iniciación', weekday: 4, startTime: '16:00', endTime: '17:00' },
    }),
  ]);

  const groupsBeta = await Promise.all([
    prisma.classGroup.upsert({
      where: { schoolId_name: { schoolId: schoolBeta.id, name: 'General' } },
      update: {},
      create: { schoolId: schoolBeta.id, name: 'General', isDefault: true, weekday: 3 },
    }),
    prisma.classGroup.upsert({
      where: { schoolId_name: { schoolId: schoolBeta.id, name: 'Avanzado' } },
      update: {},
      create: { schoolId: schoolBeta.id, name: 'Avanzado', weekday: 5, startTime: '17:00', endTime: '18:30' },
    }),
  ]);

  console.log('Sembrando usuarios profesor...');
  const teacherAlpha = await upsertUserWithRole({
    email: 'profesor.lorca@example.com',
    username: 'profesor1',
    name: 'Laura Gómez',
    password: 'Profesor123!',
    roleKey: 'TEACHER',
    mustChangePassword: true,
  });
  await prisma.userSchool.upsert({
    where: { userId_schoolId: { userId: teacherAlpha.id, schoolId: schoolAlpha.id } },
    update: {},
    create: { userId: teacherAlpha.id, schoolId: schoolAlpha.id },
  });

  const teacherBeta = await upsertUserWithRole({
    email: 'profesor.cervantes@example.com',
    username: 'profesor2',
    name: 'Carlos Ruiz',
    password: 'Profesor123!',
    roleKey: 'TEACHER',
    mustChangePassword: true,
  });
  await prisma.userSchool.upsert({
    where: { userId_schoolId: { userId: teacherBeta.id, schoolId: schoolBeta.id } },
    update: {},
    create: { userId: teacherBeta.id, schoolId: schoolBeta.id },
  });

  console.log('Sembrando alumnos...');
  const studentSeeds = [
    { school: schoolAlpha, group: groupsAlpha[0], firstName: 'Lucía', lastName: 'Fernández Ruiz', weekday: 2 },
    { school: schoolAlpha, group: groupsAlpha[0], firstName: 'Mateo', lastName: 'García Soto', weekday: 2 },
    { school: schoolAlpha, group: groupsAlpha[0], firstName: 'Sofía', lastName: 'Martín Vidal', weekday: 2 },
    { school: schoolAlpha, group: groupsAlpha[1], firstName: 'Hugo', lastName: 'López Castro', weekday: 4 },
    { school: schoolAlpha, group: groupsAlpha[1], firstName: 'Martina', lastName: 'Sánchez Ortiz', weekday: 4 },
    { school: schoolAlpha, group: groupsAlpha[1], firstName: 'Daniel', lastName: 'Romero Aguilar', weekday: 4 },
    { school: schoolBeta, group: groupsBeta[0], firstName: 'Elena', lastName: 'Navarro Iglesias', weekday: 3 },
    { school: schoolBeta, group: groupsBeta[0], firstName: 'Pablo', lastName: 'Domínguez Reyes', weekday: 3 },
    { school: schoolBeta, group: groupsBeta[0], firstName: 'Claudia', lastName: 'Serrano Vega', weekday: 3 },
    { school: schoolBeta, group: groupsBeta[1], firstName: 'Álvaro', lastName: 'Herrera Molina', weekday: 5 },
    { school: schoolBeta, group: groupsBeta[1], firstName: 'Valeria', lastName: 'Jiménez Pardo', weekday: 5 },
    { school: schoolBeta, group: groupsBeta[1], firstName: 'Diego', lastName: 'Ortega Campos', weekday: 5 },
  ];

  const students = [];
  for (const s of studentSeeds) {
    const id = `seed-student-${s.firstName}-${s.lastName}`.toLowerCase().replace(/[^a-z0-9-]/g, '-');
    const student = await prisma.student.upsert({
      where: { id },
      update: {},
      create: {
        id,
        schoolId: s.school.id,
        groupId: s.group.id,
        firstName: s.firstName,
        lastName: s.lastName,
        weekday: s.weekday,
        guardianName: `Familia ${s.lastName.split(' ')[0]}`,
        guardianPhone: '600' + String(Math.floor(100000 + Math.random() * 900000)),
        guardianEmail: `${s.firstName}.${s.lastName.split(' ')[0]}@example.com`.toLowerCase(),
      },
    });
    students.push({ ...student, teacherId: s.school.id === schoolAlpha.id ? teacherAlpha.id : teacherBeta.id });
  }

  console.log('Sembrando asistencia de las últimas semanas...');
  const now = new Date();
  const attendancePattern: AttendanceStatus[] = [
    AttendanceStatus.PRESENT,
    AttendanceStatus.PRESENT,
    AttendanceStatus.ABSENT,
    AttendanceStatus.JUSTIFIED,
  ];

  for (let weekOffset = 3; weekOffset >= 0; weekOffset -= 1) {
    const weekReference = subWeeks(now, weekOffset);
    for (const student of students) {
      const classDate = weekdayDate(weekReference, student.weekday ?? 1);
      if (classDate > now) continue;

      const status =
        weekOffset === 1 && student.groupId === groupsAlpha[1].id
          ? AttendanceStatus.CANCELLED
          : attendancePattern[(weekOffset + students.indexOf(student)) % attendancePattern.length];

      await prisma.attendance.upsert({
        where: { studentId_classDate: { studentId: student.id, classDate } },
        update: {},
        create: {
          studentId: student.id,
          schoolId: student.schoolId,
          classGroupId: student.groupId,
          classDate,
          status,
          createdByUserId: student.teacherId,
        },
      });
    }
  }

  console.log('Sembrando pagos mensuales...');
  const paymentCycles = [subMonths(now, 1), now];
  const paymentStates: { status: PaymentStatus; paidRatio: number; method: PaymentMethod | null }[] = [
    { status: PaymentStatus.PAID, paidRatio: 1, method: PaymentMethod.TRANSFER },
    { status: PaymentStatus.PAID, paidRatio: 1, method: PaymentMethod.CASH },
    { status: PaymentStatus.PARTIAL, paidRatio: 0.5, method: PaymentMethod.BIZUM },
    { status: PaymentStatus.PENDING, paidRatio: 0, method: null },
    { status: PaymentStatus.EXEMPT, paidRatio: 0, method: null },
  ];
  const EXPECTED_MONTHLY_FEE = 25;

  for (const cycle of paymentCycles) {
    const month = cycle.getMonth() + 1;
    const year = cycle.getFullYear();

    for (const [index, student] of students.entries()) {
      const state = paymentStates[index % paymentStates.length]!;
      const paidAmount = Math.round(EXPECTED_MONTHLY_FEE * state.paidRatio * 100) / 100;

      await prisma.monthlyPayment.upsert({
        where: { studentId_month_year: { studentId: student.id, month, year } },
        update: {},
        create: {
          studentId: student.id,
          schoolId: student.schoolId,
          month,
          year,
          status: state.status,
          expectedAmount: EXPECTED_MONTHLY_FEE,
          paidAmount,
          paymentDate: state.paidRatio > 0 ? cycle : null,
          method: state.method,
          createdByUserId: admin.id,
        },
      });
    }
  }

  console.log('Seed completado.');
}

main()
  .catch((error) => {
    console.error('Error al ejecutar el seed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
