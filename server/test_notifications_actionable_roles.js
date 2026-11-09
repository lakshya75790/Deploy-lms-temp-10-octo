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

async function runNotificationsActionableRolesTest() {
  console.log('🚀 Running E2E Verification for BUG-027: Notifications Role-Based Action Required Badge...\n');

  const server = app.listen(0, async () => {
    dynamicPort = server.address().port;
    try {
      const ts = Date.now();
      const adminEmail = `notif_admin_${ts}@test.com`;
      const instEmail = `notif_inst_${ts}@test.com`;
      const empEmail = `notif_emp_${ts}@test.com`;
      const passwordHash = await bcrypt.hash('Password123', 10);

      // 1. Setup Org, Admin, Instructor, Employee
      console.log('1. Setting up Org, Admin, Instructor, and Employee...');
      const org = await prisma.organization.create({
        data: {
          name: `Notif Test Org ${ts}`,
          code: `NTO${ts.toString().slice(-4)}`
        }
      });

      const admin = await prisma.user.create({
        data: {
          name: 'Notif Admin',
          email: adminEmail,
          password: passwordHash,
          role: 'Admin',
          status: 'active',
          organization: { connect: { id: org.id } }
        }
      });

      const instructor = await prisma.user.create({
        data: {
          name: 'Notif Instructor',
          email: instEmail,
          password: passwordHash,
          role: 'Instructor',
          status: 'active',
          organization: { connect: { id: org.id } }
        }
      });

      const employee = await prisma.user.create({
        data: {
          name: 'Notif Employee',
          email: empEmail,
          password: passwordHash,
          role: 'Employee',
          status: 'active',
          organization: { connect: { id: org.id } }
        }
      });

      // 2. Log in all 3 users
      console.log('\n2. Logging in users...');
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

      const empLogin = await makeRequest({
        method: 'POST',
        path: '/api/auth/login',
        body: { email: empEmail, password: 'Password123' }
      });
      const empCookie = empLogin.cookie;

      // 3. Category & Course with Assignment
      console.log('\n3. Creating Course with Project Assignment...');
      const catRes = await makeRequest({
        method: 'POST',
        path: '/api/categories',
        headers: { Cookie: adminCookie },
        body: { name: `Engineering ${ts}` }
      });
      const catId = catRes.body.data.category._id;

      const courseRes = await makeRequest({
        method: 'POST',
        path: '/api/trainings/save-full-course',
        headers: { Cookie: instCookie },
        body: {
          title: `FullStack Project Course ${ts}`,
          description: 'Build a production web app',
          categoryId: catId,
          status: 'published',
          sections: [
            {
              title: 'Module 1',
              lectures: [
                { title: 'Intro', description: 'Overview', videoUrl: 'https://example.com/v.mp4' }
              ]
            }
          ],
          assignment: {
            title: 'Final Capstone Project',
            instructions: 'Submit your GitHub repo and PDF report',
            totalScore: 100
          }
        }
      });
      const training = courseRes.body.data.training;
      const assignmentDoc = await prisma.assignment.findFirst({
        where: { trainingId: training._id }
      });
      console.log('   Assignment ID:', assignmentDoc.id, 'Title:', assignmentDoc.title);

      // 4. Assign course to employee
      console.log('\n4. Assigning course to employee...');
      await makeRequest({
        method: 'POST',
        path: '/api/assignments-engine/assign',
        headers: { Cookie: adminCookie },
        body: {
          assignmentType: 'specific',
          trainingId: training._id,
          employeeIds: [employee.id]
        }
      });

      const empAssignments = await makeRequest({
        method: 'GET',
        path: '/api/assignments-engine/my-assignments',
        headers: { Cookie: empCookie }
      });
      const tAssignId = empAssignments.body.data.assignments[0]._id;

      // 5. Employee submits assignment
      console.log('\n5. Employee submitting assignment...');
      const submitRes = await makeRequest({
        method: 'POST',
        path: `/api/assignments/${assignmentDoc.id}/submit`,
        headers: { Cookie: empCookie },
        body: {
          trainingAssignmentId: tAssignId,
          submissionType: 'github',
          githubUrl: 'https://github.com/learner/capstone-project',
          notes: 'Finished all capstone project requirements.'
        }
      });
      console.log('   Submit status:', submitRes.statusCode);
      const submissionId = submitRes.body.data.submission._id || submitRes.body.data.submission.id;
      console.log('   Submission ID:', submissionId);

      // 6. Verify Admin Notifications
      console.log('\n6. Checking Admin Notifications (GET /api/notifications)...');
      const adminNotifRes = await makeRequest({
        method: 'GET',
        path: '/api/notifications',
        headers: { Cookie: adminCookie }
      });
      const adminNotifs = adminNotifRes.body.data.notifications;
      console.log('   Admin notifications count:', adminNotifs.length);

      const adminSubNotif = adminNotifs.find(n => n.type === 'ASSIGNMENT_SUBMITTED');
      if (!adminSubNotif) {
        throw new Error('Admin did not receive the ASSIGNMENT_SUBMITTED notification!');
      }

      console.log('   Admin Notification Title:', adminSubNotif.title);
      console.log('   Admin Notification Actionable Roles:', adminSubNotif.actionable_roles);
      console.log('   Admin Notification Action Label:', adminSubNotif.action_label);
      console.log('   Admin Notification Action URL:', adminSubNotif.action_url);

      // Verify Admin is NOT authorized for action
      const isAdminActionable = Array.isArray(adminSubNotif.actionable_roles) && adminSubNotif.actionable_roles.includes('Admin');
      console.log('   Is Actionable for Org Admin? (Expected: false):', isAdminActionable);
      if (isAdminActionable) {
        throw new Error('Org Admin was incorrectly marked as actionable for Assignment Submission!');
      }

      // 7. Verify Instructor Notifications
      console.log('\n7. Checking Instructor Notifications (GET /api/notifications)...');
      const instNotifRes = await makeRequest({
        method: 'GET',
        path: '/api/notifications',
        headers: { Cookie: instCookie }
      });
      const instNotifs = instNotifRes.body.data.notifications;
      console.log('   Instructor notifications count:', instNotifs.length);

      const instSubNotif = instNotifs.find(n => n.type === 'ASSIGNMENT_REQUIRES_REVIEW' || n.type === 'ASSIGNMENT_SUBMITTED');
      if (!instSubNotif) {
        throw new Error('Instructor did not receive the assignment review notification!');
      }

      console.log('   Instructor Notification Title:', instSubNotif.title);
      console.log('   Instructor Notification Actionable Roles:', instSubNotif.actionable_roles);
      console.log('   Instructor Notification Action Label:', instSubNotif.action_label);
      console.log('   Instructor Notification Action URL:', instSubNotif.action_url);

      // Verify Instructor IS authorized for action
      const isInstActionable = Array.isArray(instSubNotif.actionable_roles) && instSubNotif.actionable_roles.includes('Instructor');
      console.log('   Is Actionable for Instructor? (Expected: true):', isInstActionable);
      if (!isInstActionable) {
        throw new Error('Instructor should be authorized and actionable for Assignment Submission review!');
      }

      // 8. Verify Backend API Authorization: Unauthorized user cannot evaluate submission
      console.log('\n8. Testing Backend API Security: Admin attempting to evaluate submission directly via PUT...');
      const adminReviewAttempt = await makeRequest({
        method: 'PUT',
        path: `/api/assignments/submissions/${submissionId}/review`,
        headers: { Cookie: adminCookie },
        body: {
          grade: 'Excellent',
          feedback: 'Admin trying to grade submission'
        }
      });
      console.log('   Admin Review Status (Expected: 403 Forbidden):', adminReviewAttempt.statusCode);
      console.log('   Admin Review Message:', adminReviewAttempt.body.message);
      if (adminReviewAttempt.statusCode !== 403) {
        throw new Error(`Expected Admin review attempt to return 403, got ${adminReviewAttempt.statusCode}`);
      }

      // 9. Instructor evaluates submission (Authorized)
      console.log('\n9. Instructor evaluating submission (Authorized)...');
      const instReviewRes = await makeRequest({
        method: 'PUT',
        path: `/api/assignments/submissions/${submissionId}/review`,
        headers: { Cookie: instCookie },
        body: {
          grade: 'Excellent',
          score: 95,
          feedback: 'Outstanding capstone implementation!'
        }
      });
      console.log('   Instructor Review Status (Expected: 200 OK):', instReviewRes.statusCode);
      if (instReviewRes.statusCode !== 200) {
        throw new Error(`Expected Instructor review to succeed with 200, got ${instReviewRes.statusCode}`);
      }

      // 10. Verify read status and unread counts continue working
      console.log('\n10. Testing mark as read for notification...');
      const markReadRes = await makeRequest({
        method: 'PUT',
        path: `/api/notifications/${instSubNotif.id || instSubNotif._id}/read`,
        headers: { Cookie: instCookie }
      });
      console.log('   Mark Read Status (Expected: 200):', markReadRes.statusCode);
      if (markReadRes.statusCode !== 200) {
        throw new Error(`Failed to mark notification as read, got ${markReadRes.statusCode}`);
      }

      console.log('\n🎉 BUG-027 NOTIFICATIONS ACTIONABLE ROLES TEST PASSED COMPLETELY! 🎉');
      server.close(() => process.exit(0));
    } catch (err) {
      console.error('\n❌ Test Error:', err);
      if (server) server.close();
      process.exit(1);
    }
  });
}

runNotificationsActionableRolesTest();
