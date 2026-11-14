/**
 * Domain-Neutral Terminology Layer
 * 
 * Supports:
 * - Company / Organization (Department -> Subgroup -> Employee)
 * - School (Class / Section -> Subgroup -> Student)
 * - College (Department / Semester -> Subgroup -> Student)
 * - Coaching / Training Institute (Batch -> Subgroup -> Student)
 */

export const TERMINOLOGY = {
  learner: 'Learner',
  learners: 'Learners',
  group: 'Group',
  groups: 'Groups',
  role: 'Subgroup',
  roles: 'Subgroups',
  assignmentEngine: 'Training Assignment Engine',
  automaticAssignment: 'Automatic Training Assignment',
  targetedAssignment: 'Targeted Training Assignment',
  groupRoleMatch: 'Group & Subgroup Match',
  individualSelection: 'Individual Learner Selection'
};

export const DOMAIN_PRESETS = {
  organization: {
    groupLabel: 'Department',
    roleLabel: 'Subgroup',
    learnerLabel: 'Employee',
    examples: ['Engineering → Software Developer', 'Marketing → Marketing Executive', 'Finance → Accountant']
  },
  school: {
    groupLabel: 'Class / Section',
    roleLabel: 'Subgroup',
    learnerLabel: 'Student',
    examples: ['Class 10-A → Student', 'Class 12-B → Student']
  },
  college: {
    groupLabel: 'Department / Semester',
    roleLabel: 'Subgroup',
    learnerLabel: 'Student',
    examples: ['CSE Semester 5 → Student', 'ECE Year 3 → Student']
  },
  coaching: {
    groupLabel: 'Batch',
    roleLabel: 'Subgroup',
    learnerLabel: 'Student',
    examples: ['JEE 2027 Morning Batch → Student', 'NEET Evening Batch → Student']
  }
};
