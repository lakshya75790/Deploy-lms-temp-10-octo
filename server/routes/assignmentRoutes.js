const express = require('express');
const router = express.Router();
const { upload } = require('../config/cloudinary');
const {
  createAssignment,
  getAssignmentById,
  updateAssignment,
  deleteAssignment,
  uploadAssignmentPdf,
  viewAssignmentPdf,
  downloadAssignmentFile,
  submitAssignment,
  getAssignmentSubmissions,
  getInstructorSubmissions,
  getEmployeeFeedback,
  reviewSubmission,
  downloadSubmissionFile,
  viewSubmissionPdf
} = require('../controllers/assignmentController');
const { protect } = require('../middleware/authMiddleware');
const { authorizeRoles } = require('../middleware/roleMiddleware');
const { cacheMiddleware } = require('../middleware/cacheMiddleware');

router.use(protect);

router.post('/upload-pdf', authorizeRoles('Instructor', 'Admin'), upload.single('file'), uploadAssignmentPdf);
router.post('/', authorizeRoles('Instructor', 'Admin'), createAssignment);
router.get('/instructor-submissions', authorizeRoles('Instructor', 'Admin'), cacheMiddleware(), getInstructorSubmissions);
router.get('/my-feedback', authorizeRoles('Employee'), cacheMiddleware(), getEmployeeFeedback);

router.route('/:id')
  .get(getAssignmentById)
  .put(authorizeRoles('Instructor', 'Admin'), updateAssignment)
  .delete(authorizeRoles('Instructor', 'Admin'), deleteAssignment);

router.get('/:id/view-pdf', authorizeRoles('Instructor', 'Admin', 'Employee'), viewAssignmentPdf);
router.get('/:id/download', authorizeRoles('Instructor', 'Admin', 'Employee'), downloadAssignmentFile);

router.post('/:id/submit', authorizeRoles('Employee'), submitAssignment);
router.get('/:id/submissions', authorizeRoles('Instructor', 'Admin'), getAssignmentSubmissions);
router.get('/submissions/:submissionId/download', authorizeRoles('Instructor', 'Admin', 'Employee'), downloadSubmissionFile);
router.get('/submissions/:submissionId/view-pdf', authorizeRoles('Instructor', 'Admin', 'Employee'), viewSubmissionPdf);
router.put('/submissions/:submissionId/review', authorizeRoles('Instructor'), reviewSubmission);

module.exports = router;
