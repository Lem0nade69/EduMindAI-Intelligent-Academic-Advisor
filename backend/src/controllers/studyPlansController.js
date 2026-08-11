/**
 * EduMind AI - Study Plans Controller
 * Task 4 & 5: Study Plan APIs + Database Connectivity
 */

import { asyncHandler } from '../middleware/errorHandler.js';
import { StudyPlans } from '../config/db.js';

// GET /api/study-plans
export const getStudyPlans = asyncHandler(async (req, res) => {
  const plans = await StudyPlans.findByUser(req.user.id);
  res.json({ status: 'success', data: { plans } });
});

// GET /api/study-plans/active
export const getActivePlan = asyncHandler(async (req, res) => {
  const plans = await StudyPlans.findByUser(req.user.id);
  const active = plans.find(p => p.active) || null;
  res.json({ status: 'success', data: { plan: active } });
});

// GET /api/study-plans/:id
export const getStudyPlan = asyncHandler(async (req, res) => {
  const plan = await StudyPlans.findById(req.params.id, req.user.id);
  if (!plan) return res.status(404).json({ status: 'error', message: 'Study plan not found.' });
  res.json({ status: 'success', data: { plan } });
});

// POST /api/study-plans
export const saveStudyPlan = asyncHandler(async (req, res) => {
  const { title, totalWeeklyHours, riskAssessment, subjects, examDates, dailyHours, planItems } = req.body;

  // Deactivate all previous plans
  await StudyPlans.deactivateAll(req.user.id);

  const plan = await StudyPlans.create({
    user_id:            req.user.id,
    title:              title             || 'My Study Plan',
    total_weekly_hours: totalWeeklyHours  || 0,
    risk_assessment:    riskAssessment    || null,
    subjects:           subjects          || [],
    exam_dates:         examDates         || {},
    daily_hours:        dailyHours        || 3,
    plan_items:         planItems         || [],
    active:             true,
  });

  res.status(201).json({ status: 'success', message: 'Study plan saved.', data: { plan } });
});

// PUT /api/study-plans/:id
export const updateStudyPlan = asyncHandler(async (req, res) => {
  const { title, active, planItems, riskAssessment } = req.body;
  const updates = {};
  if (title          !== undefined) updates.title           = title;
  if (active         !== undefined) updates.active          = active;
  if (planItems      !== undefined) updates.plan_items      = planItems;
  if (riskAssessment !== undefined) updates.risk_assessment = riskAssessment;

  const plan = await StudyPlans.update(req.params.id, req.user.id, updates);
  if (!plan) return res.status(404).json({ status: 'error', message: 'Study plan not found.' });
  res.json({ status: 'success', message: 'Study plan updated.', data: { plan } });
});

// DELETE /api/study-plans/:id
export const deleteStudyPlan = asyncHandler(async (req, res) => {
  const deleted = await StudyPlans.delete(req.params.id, req.user.id);
  if (!deleted) return res.status(404).json({ status: 'error', message: 'Study plan not found.' });
  res.json({ status: 'success', message: 'Study plan deleted.' });
});
