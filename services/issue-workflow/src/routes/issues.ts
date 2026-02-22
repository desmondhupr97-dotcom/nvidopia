import { Router, type Request, type Response } from 'express';
import crypto from 'node:crypto';
import { Issue, IssueStateTransition, IssueTimeSeries, type IssueStatus } from '@nvidopia/data-models';
import { createListHandler, createGetByIdHandler, asyncHandler } from '@nvidopia/service-toolkit';
import { executeTransition, getValidTransitions, validateTransition } from '../state-machine.js';

const router = Router();

router.get('/issues', createListHandler(Issue, {
  allowedFilters: ['run_id', 'status', 'severity', 'category'],
}));

router.post('/issues', asyncHandler(async (req: Request, res: Response) => {
  const issueId = req.body.issue_id ?? `ISS-${crypto.randomUUID().slice(0, 8)}`;
  const issue = await Issue.create({ ...req.body, issue_id: issueId, status: 'New' });
  res.status(201).json(issue);
}));

router.get('/issues/:id', createGetByIdHandler(Issue, 'issue_id', 'Issue'));

router.put('/issues/:id', asyncHandler(async (req: Request, res: Response) => {
  const { status, issue_id, ...updateFields } = req.body;
  const issue = await Issue.findOneAndUpdate(
    { issue_id: req.params.id },
    { $set: updateFields },
    { new: true, runValidators: true },
  );
  if (!issue) {
    res.status(404).json({ error: `Issue "${req.params.id}" not found` });
    return;
  }
  res.json(issue);
}));

router.put('/issues/:id/transition', asyncHandler(async (req: Request, res: Response) => {
  const { to_status, triggered_by, reason } = req.body;
  if (!to_status || !triggered_by) {
    res.status(400).json({ error: 'to_status and triggered_by are required' });
    return;
  }
  try {
    const updated = await executeTransition(req.params.id as string, to_status, triggered_by, reason);
    res.json(updated);
  } catch (err: unknown) {
    const typed = err as Error & { code?: string; allowed?: IssueStatus[] };
    if (typed.code === 'INVALID_TRANSITION') {
      res.status(400).json({ error: typed.message, allowed_transitions: typed.allowed });
      return;
    }
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(message.includes('not found') ? 404 : 500).json({ error: message });
  }
}));

router.get('/issues/:id/transitions', asyncHandler(async (req: Request, res: Response) => {
  const transitions = await IssueStateTransition.find({ issue_id: req.params.id }).sort({ created_at: 1 });
  res.json(transitions);
}));

router.post('/issues/:id/triage', asyncHandler(async (req: Request, res: Response) => {
  const { assigned_to, assigned_module, triggered_by } = req.body;
  if (!assigned_to || !assigned_module || !triggered_by) {
    res.status(400).json({ error: 'assigned_to, assigned_module, and triggered_by are required' });
    return;
  }

  const issue = await Issue.findOne({ issue_id: req.params.id });
  if (!issue) {
    res.status(404).json({ error: `Issue "${req.params.id}" not found` });
    return;
  }

  if (issue.status !== 'Triage') {
    const validation = validateTransition(issue.status as IssueStatus, 'Assigned');
    if (!validation.valid) {
      res.status(400).json({
        error: `Cannot triage: issue is in "${issue.status}" state. Must be in "Triage" state.`,
        allowed_transitions: getValidTransitions(issue.status as IssueStatus),
      });
      return;
    }
  }

  const updated = await executeTransition(
    req.params.id as string, 'Assigned', triggered_by,
    `Triaged: assigned to ${assigned_to} (${assigned_module})`,
  );

  updated.assigned_to = assigned_to;
  updated.assigned_module = assigned_module;
  await updated.save();
  res.json(updated);
}));

/* ── Vehicle Dynamics Snapshot ── */

router.post('/issues/:id/snapshot', asyncHandler(async (req: Request, res: Response) => {
  const issue = await Issue.findOne({ issue_id: req.params.id });
  if (!issue) {
    res.status(404).json({ error: `Issue "${req.params.id}" not found` });
    return;
  }
  issue.vehicle_dynamics = req.body;
  await issue.save();
  res.status(issue.vehicle_dynamics ? 200 : 201).json(issue.vehicle_dynamics);
}));

router.get('/issues/:id/snapshot', asyncHandler(async (req: Request, res: Response) => {
  const issue = await Issue.findOne({ issue_id: req.params.id }).lean();
  if (!issue) {
    res.status(404).json({ error: `Issue "${req.params.id}" not found` });
    return;
  }
  if (!issue.vehicle_dynamics) {
    res.status(404).json({ error: 'No vehicle dynamics snapshot for this issue' });
    return;
  }
  res.json(issue.vehicle_dynamics);
}));

/* ── Time-Series Data ── */

router.post('/issues/:id/timeseries', asyncHandler(async (req: Request, res: Response) => {
  const issue = await Issue.findOne({ issue_id: req.params.id }).lean();
  if (!issue) {
    res.status(404).json({ error: `Issue "${req.params.id}" not found` });
    return;
  }

  const items = Array.isArray(req.body) ? req.body : [req.body];
  const results = [];

  for (const item of items) {
    const doc = await IssueTimeSeries.findOneAndUpdate(
      { issue_id: req.params.id, channel: item.channel },
      { $set: { ...item, issue_id: req.params.id } },
      { upsert: true, new: true, runValidators: true },
    );
    results.push(doc);
  }

  res.status(201).json(results.length === 1 ? results[0] : results);
}));

router.get('/issues/:id/timeseries', asyncHandler(async (req: Request, res: Response) => {
  const channels = await IssueTimeSeries.find({ issue_id: req.params.id })
    .sort({ channel_type: 1, channel: 1 })
    .lean();
  res.json(channels);
}));

router.get('/issues/:id/timeseries/:channel', asyncHandler(async (req: Request, res: Response) => {
  const doc = await IssueTimeSeries.findOne({
    issue_id: req.params.id,
    channel: req.params.channel,
  }).lean();
  if (!doc) {
    res.status(404).json({ error: `Channel "${req.params.channel}" not found for issue "${req.params.id}"` });
    return;
  }
  res.json(doc);
}));

export default router;
