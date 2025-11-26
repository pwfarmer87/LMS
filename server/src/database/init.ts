import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { schema } from './schema';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

const DATA_DIR = path.join(__dirname, '../../data');
const DB_PATH = process.env.DATABASE_PATH || path.join(DATA_DIR, 'lms.db');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

export function initializeDatabase(): Database.Database {
  const db = new Database(DB_PATH);

  // Enable foreign keys
  db.pragma('foreign_keys = ON');

  // Execute schema
  db.exec(schema);

  console.log('Database initialized successfully');

  return db;
}

export function seedDemoData(db: Database.Database): void {
  // Check if demo user already exists
  const existingUser = db.prepare('SELECT id FROM users WHERE email = ?').get('demo@faculty.edu');

  if (existingUser) {
    console.log('Demo data already exists, skipping seed');
    return;
  }

  console.log('Seeding demo data...');

  // Create demo faculty user
  const userId = uuidv4();
  const passwordHash = bcrypt.hashSync('demo123', 10);

  db.prepare(`
    INSERT INTO users (id, email, password_hash, first_name, last_name, role, department)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(userId, 'demo@faculty.edu', passwordHash, 'Sarah', 'Johnson', 'faculty', 'Computer Science');

  // Create demo courses
  const course1Id = uuidv4();
  const course2Id = uuidv4();
  const course3Id = uuidv4();

  db.prepare(`
    INSERT INTO courses (id, instructor_id, title, code, description, semester, year, status, max_students)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    course1Id, userId,
    'Introduction to Computer Science', 'CS101',
    'A comprehensive introduction to computer science fundamentals including programming, algorithms, and data structures.',
    'Fall', 2024, 'active', 35
  );

  db.prepare(`
    INSERT INTO courses (id, instructor_id, title, code, description, semester, year, status, max_students)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    course2Id, userId,
    'Data Structures and Algorithms', 'CS201',
    'Advanced study of data structures and algorithm design and analysis.',
    'Fall', 2024, 'active', 30
  );

  db.prepare(`
    INSERT INTO courses (id, instructor_id, title, code, description, semester, year, status, max_students)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    course3Id, userId,
    'Machine Learning Fundamentals', 'CS401',
    'Introduction to machine learning concepts, algorithms, and practical applications.',
    'Fall', 2024, 'draft', 25
  );

  // Create modules for CS101
  const module1Id = uuidv4();
  const module2Id = uuidv4();

  db.prepare(`
    INSERT INTO modules (id, course_id, title, description, order_index, is_published)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(module1Id, course1Id, 'Getting Started with Programming', 'Introduction to programming concepts and Python basics', 1, 1);

  db.prepare(`
    INSERT INTO modules (id, course_id, title, description, order_index, is_published)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(module2Id, course1Id, 'Control Flow and Functions', 'Understanding conditionals, loops, and function definitions', 2, 1);

  // Create content items
  db.prepare(`
    INSERT INTO content_items (id, module_id, title, content_type, content, order_index, duration_minutes, is_published)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(uuidv4(), module1Id, 'Welcome to Programming', 'lecture',
    '# Welcome to Programming\n\nIn this lecture, we will explore the fundamentals of computer programming...',
    1, 45, 1);

  db.prepare(`
    INSERT INTO content_items (id, module_id, title, content_type, content, order_index, duration_minutes, is_published)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(uuidv4(), module1Id, 'Python Installation Guide', 'reading',
    '# Setting Up Python\n\nFollow these steps to install Python on your computer...',
    2, 20, 1);

  // Create assignments
  db.prepare(`
    INSERT INTO assignments (id, course_id, module_id, title, description, instructions, max_points, due_date, assignment_type, ai_grading_enabled)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    uuidv4(), course1Id, module1Id,
    'Hello World Program',
    'Write your first Python program',
    'Create a Python program that prints "Hello, World!" to the console. Then modify it to ask for the user\'s name and greet them personally.',
    100, '2024-09-15', 'assignment', 1
  );

  // Create demo students
  const studentIds: string[] = [];
  const students = [
    { email: 'alice@student.edu', firstName: 'Alice', lastName: 'Smith', studentId: 'STU001' },
    { email: 'bob@student.edu', firstName: 'Bob', lastName: 'Wilson', studentId: 'STU002' },
    { email: 'carol@student.edu', firstName: 'Carol', lastName: 'Davis', studentId: 'STU003' },
    { email: 'david@student.edu', firstName: 'David', lastName: 'Brown', studentId: 'STU004' },
    { email: 'emma@student.edu', firstName: 'Emma', lastName: 'Taylor', studentId: 'STU005' },
  ];

  for (const student of students) {
    const studentId = uuidv4();
    studentIds.push(studentId);
    db.prepare(`
      INSERT INTO students (id, email, first_name, last_name, student_id)
      VALUES (?, ?, ?, ?, ?)
    `).run(studentId, student.email, student.firstName, student.lastName, student.studentId);
  }

  // Enroll students in CS101
  for (const studentId of studentIds) {
    db.prepare(`
      INSERT INTO enrollments (id, course_id, student_id, status)
      VALUES (?, ?, ?, ?)
    `).run(uuidv4(), course1Id, studentId, 'active');
  }

  // Enroll some students in CS201
  for (let i = 0; i < 3; i++) {
    db.prepare(`
      INSERT INTO enrollments (id, course_id, student_id, status)
      VALUES (?, ?, ?, ?)
    `).run(uuidv4(), course2Id, studentIds[i], 'active');
  }

  console.log('Demo data seeded successfully');
  console.log('Demo login: demo@faculty.edu / demo123');
}

// Run initialization if this file is executed directly
if (require.main === module) {
  const db = initializeDatabase();
  seedDemoData(db);
  db.close();
}
