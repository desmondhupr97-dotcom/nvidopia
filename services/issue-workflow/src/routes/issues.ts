import { Router, type Request, type Response } from 'express';
import crypto from 'node:crypto';
import { Issue, IssueStateTransition, type IssueStatus } from '../models/index.js';
import { executeTransition, getValidTransitions, validateTransition } from '../state-machine.js';

const router = Router();

function asSingleParam(value: string | string[]): string {
  return Array.isArray(value) ? value[0] : value;
}

router.get('/issues', async (req: Request, res: Response) => {
  try {
    const filter: Record<string, unknown> = {};
    if (req.query.run_id) filter.run_id = req.query.run_id;
    if (req.query.status) filter.status = req.query.status;
    if (req.query.severity) filter.severity = req.query.severity;
    if (req.query.category) filter.category = req.query.category;

    const issues = await Issue.find(filter).sort({ created_at: -1 });
    res.json(issues);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});

router.post('/issues', async (req: Request, res: Response) => {
  try {
    const issueId = req.body.issue_id ?? `ISS-${crypto.randomUUID().slice(0, 8)}`;
    const issue = await Issue.create({
      ...req.body,
      issue_id: issueId,
      status: 'New',
    });
    res.status(201).json(issue);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(400).json({ error: message });
  }
});

router.get('/issues/:id', async (req: Request, res: Response) => {
  try {
    const issue = await Issue.findOne({ issue_id: req.params.id });
    if (!issue) {
      res.status(404).json({ error: `Issue "${req.params.id}" not found` });
      return;
    }
    res.json(issue);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});

router.put('/issues/:id', async (req: Request, res: Response) => {
  try {
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
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(400).json({ error: message });
  }
});

router.put('/issues/:id/transition', async (req: Request, res: Response) => {
  try {
    const { to_status, triggered_by, reason } = req.body;
    if (!to_status || !triggered_by) {
      res.status(400).json({ error: 'to_status and triggered_by are required' });
      return;
    }

    const issueId = asSingleParam(req.params.id);
    const updated = await executeTransition(issueId, to_status, triggered_by, reason);
    res.json(updated);
  } catch (err: unknown) {
    const typed = err as Error & { code?: string; allowed?: IssueStatus[] };
    if (typed.code === 'INVALID_TRANSITION') {
      res.status(400).json({
        error: typed.message,
        allowed_transitions: typed.allowed,
      });
      return;
    }
    const message = err instanceof Error ? err.message : 'Unknown error';
    const status = message.includes('not found') ? 404 : 500;
    res.status(status).json({ error: message });
  }
});

router.get('/issues/:id/transitions', async (req: Request, res: Response) => {
  try {
    const transitions = await IssueStateTransition
      .find({ issue_id: req.params.id })
      .sort({ created_at: 1 });
    res.json(transitions);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});

router.post('/issues/:id/triage', async (req: Request, res: Response) => {
  try {
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

    const issueId = asSingleParam(req.params.id);
    const updated = await executeTransition(
      issueId,
      'Assigned',
      triggered_by,
      `Triaged: assigned to ${assigned_to} (${assigned_module})`,
    );

    updated.assigned_to = assigned_to;
    updated.assigned_module = assigned_module;
    await updated.save();

    res.json(updated);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});

export default router;
