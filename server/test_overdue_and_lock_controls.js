const http = require('http');
const dotenv = require('dotenv');
dotenv.config();

const app = require('./app');
const { prisma, withId } = require('./config/prismaClient');
const bcrypt = require('bcryptjs');

let dynamicPort = 0;

function makeRequest({ method, path, headers = {}, body = null, port = 0 }) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: '127.0.0.1',
      port: port || dynamicPort,
      path,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        let json = {};
        try {
          json = JSON.parse(data);
        } catch (e) {
          json = { raw: data };
        }
        const setCookieHeader = res.headers['set-cookie'];
        let cookie = '';
        if (setCookieHeader && setCookieHeader.length > 0) {
          cookie = setCookieHeader.map(c => c.split(';')[0]).join('; ');
        }
        resolve({ statusCode: res.statusCode, cookie, body: json });
      });
    });

    req.on('error', err => reject(err));
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function runOverdueAndLockControlsE2ETest() {
  console.log('🚀 Running E2E Verification for Instructor Overdue & Per-Employee Lock Controls...\n');

  const server = app.listen(0, async () => {
    dynamicPort = server.address().port;
    try {
      const ts = Date.now();
      const adminEmail = `lc_admin_${ts}@test.com`;
      const instEmail = `lc_inst_${ts}@test.com`;
      const emp1Email = `lc_harshita_${ts}@test.com`;
      const emp2Email = `lc_lakshya_${ts}@test.com`;
      const emp3Email = `lc_aman_${ts}@test.com`;
      const passwordHash = await bcrypt.hash('Password123', 10);

      // 1. Setup Org & Users directly in Prisma
      console.log('1. Setting up Org, Admin, Instructor, and 3 Employees (Harshita, Lakshya, Aman)...');
      const org = await prisma.organization.create({
        data: {
          name: `Lock Control Org ${ts}`,
          code: `LCO${ts.toString().slice(-4)}`
        }
      });

      const admin = await prisma.user.create({
        data: {
          name: 'Lock Admin',
          email: adminEmail,
          password: passwordHash,
          role: 'Admin',
          status: 'active',
          organization: { connect: { id: org.id } }
        }
      });

      const instructor = await prisma.user.create({
        data: {
          name: 'Master Instructor',
          email: instEmail,
          password: passwordHash,
          role: 'Instructor',
          status: 'active',
          organization: { connect: { id: org.id } }
        }
      });

      const emp1 = await prisma.user.create({
        data: {
          name: 'Harshita Paliwal',
          email: emp1Email,
          password: passwordHash,
          role: 'Employee',
          status: 'active',
          organization: { connect: { id: org.id } }
        }
      });
      const emp1Id = emp1.id;

      const emp2 = await prisma.user.create({
        data: {
          name: 'Lakshya Joshi',
          email: emp2Email,
          password: passwordHash,
          role: 'Employee',
          status: 'active',
          organization: { connect: { id: org.id } }
        }
      });
      const emp2Id = emp2.id;

      const emp3 = await prisma.user.create({
        data: {
          name: 'Aman Kumar',
          email: emp3Email,
          password: passwordHash,
          role: 'Employee',
          status: 'active',
          organization: { connect: { id: org.id } }
        }
      });
      const emp3Id = emp3.id;

      // 2. Log in all users to obtain session cookies
      console.log('\n2. Logging in Admin, Instructor, and 3 Employees...');
      const adminLogin = await makeRequest({
        method: 'POST',
        path: '/api/auth/login',
        body: { email: adminEmail, password: 'Password123' }
      });
      const adminCookie = adminLogin.cookie;

      const instLogin = await makeRequest({
        method: 'POST',
        path: '/api/auth/login',
        body: { email: instEmail, password: 'Password123' }
      });
      const instCookie = instLogin.cookie;

      const emp1Login = await makeRequest({
        method: 'POST',
        path: '/api/auth/login',
        body: { email: emp1Email, password: 'Password123' }
      });
      const emp1Cookie = emp1Login.cookie;

      const emp2Login = await makeRequest({
        method: 'POST',
        path: '/api/auth/login',
        body: { email: emp2Email, password: 'Password123' }
      });
      const emp2Cookie = emp2Login.cookie;

      const emp3Login = await makeRequest({
        method: 'POST',
        path: '/api/auth/login',
        body: { email: emp3Email, password: 'Password123' }
      });
      const emp3Cookie = emp3Login.cookie;

      const catRes = await makeRequest({
        method: 'POST',
        path: '/api/categories',
        headers: { Cookie: adminCookie },
        body: { name: `Workplace Skills ${ts}` }
      });
      const catId = catRes.body.data.category._id;

      // 3. Instructor creates Training
      console.log('\n3. Instructor Creating Course "Professional Communication & Workplace Skills"...');
      const courseRes = await makeRequest({
        method: 'POST',
        path: '/api/trainings/save-full-course',
        headers: { Cookie: instCookie },
        body: {
          title: 'Professional Communication & Workplace Skills',
          description: 'Master teamwork and active listening',
          categoryId: catId,
          status: 'published',
          sections: [
            {
              title: 'Section 1',
              lectures: [
                { title: 'Lesson 1.1', description: 'Basics', videoUrl: 'https://cdn.example.com/l1.mp4' }
              ]
            }
          ]
        }
      });
      const training = courseRes.body.data.training;
      const sub1Id = training.sections[0].subSections[0]._id;

      // 4. Assign training to all 3 employees
      console.log('\n4. Assigning Training to Harshita, Lakshya, and Aman...');
      await makeRequest({
        method: 'POST',
        path: '/api/assignments-engine/assign',
        headers: { Cookie: adminCookie },
        body: {
          assignmentType: 'specific',
          trainingId: training._id,
          employeeIds: [emp1Id, emp2Id, emp3Id]
        }
      });

      // Get individual assignment IDs
      const hAssignRes = await makeRequest({ method: 'GET', path: '/api/assignments-engine/my-assignments', headers: { Cookie: emp1Cookie } });
      const hAssignId = hAssignRes.body.data.assignments[0]._id;

      const lAssignRes = await makeRequest({ method: 'GET', path: '/api/assignments-engine/my-assignments', headers: { Cookie: emp2Cookie } });
      const lAssignId = lAssignRes.body.data.assignments[0]._id;

      const aAssignRes = await makeRequest({ method: 'GET', path: '/api/assignments-engine/my-assignments', headers: { Cookie: emp3Cookie } });
      const aAssignId = aAssignRes.body.data.assignments[0]._id;

      // 5. CASE 1: Harshita completes training -> Verify NO actions allowed for Completed
      console.log('\n5. [CASE 1] Harshita completes training (100%)...');
      await prisma.trainingAssignment.update({
        where: { id: hAssignId },
        data: { status: 'Completed', progressPercentage: 100 }
      });

      const hDoc = await prisma.trainingAssignment.findUnique({ where: { id: hAssignId } });
      console.log('   Harshita Status:', hDoc.status, 'Progress:', hDoc.progressPercentage);

      // Verify Backend rejects Extend Deadline, Lock, and Unlock for Completed Harshita
      const badExtend = await makeRequest({
        method: 'PUT',
        path: `/api/assignments-engine/${hAssignId}/extend-deadline`,
        headers: { Cookie: instCookie },
        body: { newDeadline: '2026-12-31' }
      });
      console.log('   Instructor Extend Deadline on Completed (Should fail 400):', badExtend.statusCode);

      const badLock = await makeRequest({
        method: 'PUT',
        path: `/api/assignments-engine/${hAssignId}/lock`,
        headers: { Cookie: instCookie },
        body: { reason: 'Test lock' }
      });
      console.log('   Instructor Lock on Completed (Should fail 400):', badLock.statusCode);

      if (badExtend.statusCode !== 400 || badLock.statusCode !== 400) {
        throw new Error('Backend failed to reject extend/lock actions on completed assignment!');
      }

      // 6. CASE 2 & 3: Lakshya (Assigned / In Progress) -> Lock and Unlock Lakshya only
      console.log('\n6. [CASE 2 & 3] Locking Lakshya (Per-Employee Lock)...');
      const lockLakshya = await makeRequest({
        method: 'PUT',
        path: `/api/assignments-engine/${lAssignId}/lock`,
        headers: { Cookie: instCookie },
        body: { reason: 'Test lock for Lakshya' }
      });
      console.log('   Lock Lakshya Status:', lockLakshya.statusCode);

      // Verify Lakshya is locked
      const lDoc = await prisma.trainingAssignment.findUnique({ where: { id: lAssignId } });
      console.log('   Lakshya Lock State:', lDoc.isLocked, 'Status:', lDoc.status);

      // Verify Harshita and Aman are NOT locked (Per-Employee isolation)
      const hCheck = await prisma.trainingAssignment.findUnique({ where: { id: hAssignId } });
      const aCheck = await prisma.trainingAssignment.findUnique({ where: { id: aAssignId } });
      console.log('   Harshita Locked?:', hCheck.isLocked || false);
      console.log('   Aman Locked?:', aCheck.isLocked || false);

      if (lDoc.isLocked !== true || hCheck.isLocked || aCheck.isLocked) {
        throw new Error('Per-employee lock isolation failed!');
      }

      // Verify Lakshya access is rejected when locked
      const lakshyaProgressAttempt = await makeRequest({
        method: 'POST',
        path: '/api/progress/complete-subsection',
        headers: { Cookie: emp2Cookie },
        body: { trainingAssignmentId: lAssignId, subSectionId: sub1Id }
      });
      console.log('   Lakshya Progress Attempt when Locked (Should fail 403):', lakshyaProgressAttempt.statusCode);

      if (lakshyaProgressAttempt.statusCode !== 403) {
        throw new Error('Locked employee was able to complete lessons!');
      }

      // Unlock Lakshya
      console.log('   Unlocking Lakshya...');
      await makeRequest({
        method: 'PUT',
        path: `/api/assignments-engine/${lAssignId}/unlock`,
        headers: { Cookie: instCookie }
      });
      const lUnlockedDoc = await prisma.trainingAssignment.findUnique({ where: { id: lAssignId } });
      console.log('   Lakshya Unlocked State:', lUnlockedDoc.isLocked, 'Status:', lUnlockedDoc.status);

      // 7. CASE 4, 5, 6: Aman (Overdue Employee) -> Lock, Unlock, Extend Deadline
      console.log('\n7. [CASE 4, 5, 6] Simulating Overdue status for Aman...');
      await prisma.trainingAssignment.update({
        where: { id: aAssignId },
        data: { deadline: new Date('2026-01-01'), status: 'Overdue' }
      });

      const aOverdueDoc = await prisma.trainingAssignment.findUnique({ where: { id: aAssignId } });
      console.log('   Aman Status:', aOverdueDoc.status, 'Deadline:', aOverdueDoc.deadline);

      // Lock Overdue Aman
      console.log('   Locking Overdue Aman...');
      await makeRequest({
        method: 'PUT',
        path: `/api/assignments-engine/${aAssignId}/lock`,
        headers: { Cookie: instCookie },
        body: { reason: 'Overdue policy lock' }
      });

      const aLockedDoc = await prisma.trainingAssignment.findUnique({ where: { id: aAssignId } });
      console.log('   Aman Locked State:', aLockedDoc.isLocked, 'Status:', aLockedDoc.status);

      // Unlock Overdue Aman -> Should revert to Overdue because deadline is in past
      console.log('   Unlocking Overdue Aman...');
      await makeRequest({
        method: 'PUT',
        path: `/api/assignments-engine/${aAssignId}/unlock`,
        headers: { Cookie: instCookie }
      });

      const aUnlockedDoc = await prisma.trainingAssignment.findUnique({ where: { id: aAssignId } });
      console.log('   Aman Unlocked State:', aUnlockedDoc.isLocked, 'Status:', aUnlockedDoc.status);

      if (aUnlockedDoc.status !== 'Overdue') {
        throw new Error('Unlocking overdue assignment failed to maintain Overdue status!');
      }

      // Extend Deadline for Aman -> Should update deadline and clear Overdue status to Assigned/In Progress
      console.log('   Extending Deadline for Aman to 2026-12-31...');
      await makeRequest({
        method: 'PUT',
        path: `/api/assignments-engine/${aAssignId}/extend-deadline`,
        headers: { Cookie: instCookie },
        body: { newDeadline: '2026-12-31', reason: 'Extended after extension request' }
      });

      const aExtendedDoc = await prisma.trainingAssignment.findUnique({ where: { id: aAssignId } });
      console.log('   Aman Status after Extension:', aExtendedDoc.status, 'Deadline:', aExtendedDoc.deadline);

      if (aExtendedDoc.status === 'Overdue' || aExtendedDoc.status === 'Locked') {
        throw new Error('Extending deadline failed to clear Overdue/Locked status!');
      }

      // 8. BUG-025: Verify Inactive / Deactivated learner handling in Overdue & Lock Controls
      console.log('\n8. [BUG-025] Testing Inactive / Deactivated Learner Filtering and Lock Prevention...');
      
      // Step A: Initially all active learners are returned in GET /api/assignments-engine/all
      const allActiveRes = await makeRequest({
        method: 'GET',
        path: '/api/assignments-engine/all',
        headers: { Cookie: instCookie }
      });
      console.log('   Active Roster Count:', allActiveRes.body.data.assignments.length);
      const hasAmanActive = allActiveRes.body.data.assignments.some(a => (a.employeeId?._id || a.employeeId?.id) === emp3Id);
      if (!hasAmanActive) {
        throw new Error('Active learner Aman was unexpectedly missing from assignments list!');
      }

      // Step B: Admin deactivates Aman
      console.log('   Admin deactivating Aman...');
      const deactRes = await makeRequest({
        method: 'PUT',
        path: `/api/org/users/${emp3Id}/status`,
        headers: { Cookie: adminCookie },
        body: { status: 'deactivated' }
      });
      console.log('   Deactivate Aman Status:', deactRes.statusCode);

      // Step C: Verify GET /api/assignments-engine/all excludes deactivated Aman
      const rosterAfterDeact = await makeRequest({
        method: 'GET',
        path: '/api/assignments-engine/all',
        headers: { Cookie: instCookie }
      });
      const hasAmanAfterDeact = rosterAfterDeact.body.data.assignments.some(a => (a.employeeId?._id || a.employeeId?.id) === emp3Id);
      console.log('   Roster Count after Aman deactivation:', rosterAfterDeact.body.data.assignments.length);
      console.log('   Is Deactivated Aman in Roster?:', hasAmanAfterDeact);
      if (hasAmanAfterDeact) {
        throw new Error('Deactivated learner Aman should NOT be present in assignments list!');
      }

      // Step D: Verify direct API attempt to lock deactivated Aman is blocked with 400
      console.log('   Attempting to lock deactivated Aman directly via API...');
      const lockDeactRes = await makeRequest({
        method: 'PUT',
        path: `/api/assignments-engine/${aAssignId}/lock`,
        headers: { Cookie: instCookie },
        body: { reason: 'Unauthorized lock attempt' }
      });
      console.log('   Lock Deactivated Aman Response Status (Expected 400):', lockDeactRes.statusCode);
      console.log('   Lock Deactivated Error Message:', lockDeactRes.body.message);
      if (lockDeactRes.statusCode !== 400) {
        throw new Error(`Expected lock on deactivated learner to return 400, got ${lockDeactRes.statusCode}`);
      }

      // Step E: Verify training lock status preservation across deactivation and reactivation
      console.log('   Testing lock status preservation across deactivation & reactivation for Lakshya...');
      // Lock active Lakshya
      await makeRequest({
        method: 'PUT',
        path: `/api/assignments-engine/${lAssignId}/lock`,
        headers: { Cookie: instCookie },
        body: { reason: 'Pre-deactivation lock' }
      });
      const lPreDeactDoc = await prisma.trainingAssignment.findUnique({ where: { id: lAssignId } });
      console.log('   Lakshya locked prior to deactivation:', lPreDeactDoc.isLocked);

      // Deactivate Lakshya
      await makeRequest({
        method: 'PUT',
        path: `/api/org/users/${emp2Id}/status`,
        headers: { Cookie: adminCookie },
        body: { status: 'deactivated' }
      });

      // Verify lock status remains preserved in DB
      const lDuringDeactDoc = await prisma.trainingAssignment.findUnique({ where: { id: lAssignId } });
      console.log('   Lakshya lock preserved during deactivation:', lDuringDeactDoc.isLocked);
      if (lDuringDeactDoc.isLocked !== true) {
        throw new Error('Training lock was erroneously removed when learner was deactivated!');
      }

      // Reactivate Lakshya
      await makeRequest({
        method: 'PUT',
        path: `/api/org/users/${emp2Id}/status`,
        headers: { Cookie: adminCookie },
        body: { status: 'active' }
      });

      // Verify Lakshya is back in the roster with lock preserved
      const rosterAfterReact = await makeRequest({
        method: 'GET',
        path: '/api/assignments-engine/all',
        headers: { Cookie: instCookie }
      });
      const lakshyaAfterReact = rosterAfterReact.body.data.assignments.find(a => (a.employeeId?._id || a.employeeId?.id) === emp2Id);
      console.log('   Lakshya in roster after reactivation:', Boolean(lakshyaAfterReact));
      console.log('   Lakshya lock preserved in roster:', lakshyaAfterReact?.isLocked || lakshyaAfterReact?.status === 'Locked');
      if (!lakshyaAfterReact || !(lakshyaAfterReact.isLocked || lakshyaAfterReact.status === 'Locked')) {
        throw new Error('Reactivated learner should appear in roster with previous lock status preserved!');
      }

      // Unlock reactivated Lakshya
      await makeRequest({
        method: 'PUT',
        path: `/api/assignments-engine/${lAssignId}/unlock`,
        headers: { Cookie: instCookie }
      });
      const lFinalDoc = await prisma.trainingAssignment.findUnique({ where: { id: lAssignId } });
      console.log('   Lakshya successfully unlocked after reactivation:', !lFinalDoc.isLocked);

      console.log('\n🎉 INSTRUCTOR OVERDUE & PER-EMPLOYEE LOCK CONTROLS E2E TEST PASSED PERFECTLY! 🎉');
      server.close(() => process.exit(0));
    } catch (err) {
      console.error('\n❌ E2E Test Error:', err);
      if (server) server.close();
      process.exit(1);
    }
  });
}

runOverdueAndLockControlsE2ETest();
