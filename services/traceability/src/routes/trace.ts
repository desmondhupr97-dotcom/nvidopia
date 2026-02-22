import { Router, type Request, type Response } from 'express';
import { Requirement } from '../models/requirement.model.js';
import { Commit } from '../models/commit.model.js';
import { Issue } from '../models/issue.model.js';

const router = Router();

/**
 * Forward trace: Requirement -> Commits -> Builds -> Projects -> Tasks -> Runs -> Issues
 */
router.get('/trace/forward/:req_id', async (req: Request, res: Response) => {
  try {
    const { req_id } = req.params;

    const pipeline = [
      { $match: { req_id } },

      // Requirement -> Commits that reference this requirement
      {
        $lookup: {
          from: 'commits',
          let: { rid: '$req_id' },
          pipeline: [
            { $match: { $expr: { $in: ['$$rid', { $ifNull: ['$linked_req_ids', []] }] } } },
          ],
          as: 'commits',
        },
      },

      // Commits -> Builds that contain any of these commits
      {
        $lookup: {
          from: 'builds',
          let: { hashes: { $map: { input: '$commits', as: 'c', in: '$$c.commit_hash' } } },
          pipeline: [
            {
              $match: {
                $expr: {
                  $gt: [
                    { $size: { $setIntersection: [{ $ifNull: ['$commit_hashes', []] }, '$$hashes'] } },
                    0,
                  ],
                },
              },
            },
          ],
          as: 'builds',
        },
      },

      // Builds -> Projects whose software_baseline_version matches any build version_tag
      {
        $lookup: {
          from: 'projects',
          let: { tags: { $map: { input: '$builds', as: 'b', in: '$$b.version_tag' } } },
          pipeline: [
            { $match: { $expr: { $in: ['$software_baseline_version', '$$tags'] } } },
          ],
          as: 'projects',
        },
      },

      // Projects -> Tasks
      {
        $lookup: {
          from: 'tasks',
          let: { pids: { $map: { input: '$projects', as: 'p', in: '$$p.project_id' } } },
          pipeline: [
            { $match: { $expr: { $in: ['$project_id', '$$pids'] } } },
          ],
          as: 'tasks',
        },
      },

      // Tasks -> Runs
      {
        $lookup: {
          from: 'runs',
          let: { tids: { $map: { input: '$tasks', as: 't', in: '$$t.task_id' } } },
          pipeline: [
            { $match: { $expr: { $in: ['$task_id', '$$tids'] } } },
          ],
          as: 'runs',
        },
      },

      // Runs -> Issues
      {
        $lookup: {
          from: 'issues',
          let: { rids: { $map: { input: '$runs', as: 'r', in: '$$r.run_id' } } },
          pipeline: [
            { $match: { $expr: { $in: ['$run_id', '$$rids'] } } },
          ],
          as: 'issues',
        },
      },

      {
        $project: {
          _id: 0,
          requirement: { req_id: '$req_id', description: '$description', asil_level: '$asil_level' },
          commits: { $map: { input: '$commits', as: 'c', in: { commit_hash: '$$c.commit_hash', message: '$$c.message', linked_req_ids: '$$c.linked_req_ids' } } },
          builds: { $map: { input: '$builds', as: 'b', in: { build_hash: '$$b.build_hash', version_tag: '$$b.version_tag' } } },
          projects: { $map: { input: '$projects', as: 'p', in: { project_id: '$$p.project_id', name: '$$p.name', software_baseline_version: '$$p.software_baseline_version' } } },
          tasks: { $map: { input: '$tasks', as: 't', in: { task_id: '$$t.task_id', name: '$$t.name', task_type: '$$t.task_type', status: '$$t.status' } } },
          runs: { $map: { input: '$runs', as: 'r', in: { run_id: '$$r.run_id', task_id: '$$r.task_id', status: '$$r.status', vehicle_vin: '$$r.vehicle_vin' } } },
          issues: { $map: { input: '$issues', as: 'i', in: { issue_id: '$$i.issue_id', run_id: '$$i.run_id', severity: '$$i.severity', status: '$$i.status' } } },
        },
      },
    ];

    const [result] = await Requirement.aggregate(pipeline);

    if (!result) {
      res.status(404).json({ error: `Requirement "${req_id}" not found` });
      return;
    }

    res.json({ trace_type: 'forward', ...result });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});

/**
 * Backward trace: Issue -> Run -> Task -> Project -> Commits -> Requirements
 */
router.get('/trace/backward/:issue_id', async (req: Request, res: Response) => {
  try {
    const { issue_id } = req.params;

    const pipeline = [
      { $match: { issue_id } },

      // Issue -> Run
      {
        $lookup: {
          from: 'runs',
          localField: 'run_id',
          foreignField: 'run_id',
          as: 'run',
        },
      },
      { $unwind: { path: '$run', preserveNullAndEmptyArrays: true } },

      // Run -> Task
      {
        $lookup: {
          from: 'tasks',
          localField: 'run.task_id',
          foreignField: 'task_id',
          as: 'task',
        },
      },
      { $unwind: { path: '$task', preserveNullAndEmptyArrays: true } },

      // Task -> Project
      {
        $lookup: {
          from: 'projects',
          localField: 'task.project_id',
          foreignField: 'project_id',
          as: 'project',
        },
      },
      { $unwind: { path: '$project', preserveNullAndEmptyArrays: true } },

      // Issue -> Commits (via fix_commit_id OR linked_issue_ids)
      {
        $lookup: {
          from: 'commits',
          let: { fci: '$fix_commit_id', iid: '$issue_id' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $or: [
                    { $eq: ['$commit_hash', '$$fci'] },
                    { $in: ['$$iid', { $ifNull: ['$linked_issue_ids', []] }] },
                  ],
                },
              },
            },
          ],
          as: 'commits',
        },
      },

      // Commits -> Requirements (where commit linked_req_ids overlap)
      {
        $lookup: {
          from: 'requirements',
          let: {
            all_req_ids: {
              $reduce: {
                input: '$commits',
                initialValue: [] as string[],
                in: { $setUnion: ['$$value', { $ifNull: ['$$this.linked_req_ids', []] }] },
              },
            },
          },
          pipeline: [
            { $match: { $expr: { $in: ['$req_id', '$$all_req_ids'] } } },
          ],
          as: 'requirements',
        },
      },

      {
        $project: {
          _id: 0,
          issue: { issue_id: '$issue_id', severity: '$severity', status: '$status', category: '$category' },
          run: { run_id: '$run.run_id', task_id: '$run.task_id', status: '$run.status', vehicle_vin: '$run.vehicle_vin' },
          task: { task_id: '$task.task_id', name: '$task.name', task_type: '$task.task_type', project_id: '$task.project_id' },
          project: { project_id: '$project.project_id', name: '$project.name', software_baseline_version: '$project.software_baseline_version' },
          commits: { $map: { input: '$commits', as: 'c', in: { commit_hash: '$$c.commit_hash', message: '$$c.message', linked_req_ids: '$$c.linked_req_ids' } } },
          requirements: { $map: { input: '$requirements', as: 'r', in: { req_id: '$$r.req_id', description: '$$r.description', asil_level: '$$r.asil_level' } } },
        },
      },
    ];

    const [result] = await Issue.aggregate(pipeline);

    if (!result) {
      res.status(404).json({ error: `Issue "${issue_id}" not found` });
      return;
    }

    res.json({ trace_type: 'backward', ...result });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});

/**
 * Impact analysis: Issue -> backward to requirements -> forward from each requirement to all affected tasks/runs
 */
router.get('/trace/impact/:issue_id', async (req: Request, res: Response) => {
  try {
    const { issue_id } = req.params;

    // Step 1: backward trace to find impacted requirements
    const backwardPipeline = [
      { $match: { issue_id } },
      {
        $lookup: {
          from: 'commits',
          let: { fci: '$fix_commit_id', iid: '$issue_id' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $or: [
                    { $eq: ['$commit_hash', '$$fci'] },
                    { $in: ['$$iid', { $ifNull: ['$linked_issue_ids', []] }] },
                  ],
                },
              },
            },
          ],
          as: 'commits',
        },
      },
      {
        $project: {
          _id: 0,
          issue_id: 1,
          severity: 1,
          status: 1,
          req_ids: {
            $reduce: {
              input: '$commits',
              initialValue: [] as string[],
              in: { $setUnion: ['$$value', { $ifNull: ['$$this.linked_req_ids', []] }] },
            },
          },
        },
      },
    ];

    const [backwardResult] = await Issue.aggregate(backwardPipeline);

    if (!backwardResult) {
      res.status(404).json({ error: `Issue "${issue_id}" not found` });
      return;
    }

    const reqIds: string[] = backwardResult.req_ids ?? [];

    if (reqIds.length === 0) {
      res.json({
        trace_type: 'impact',
        source_issue: { issue_id, severity: backwardResult.severity, status: backwardResult.status },
        impacted_requirements: [],
        affected_tasks: [],
        affected_runs: [],
      });
      return;
    }

    // Step 2: forward trace from requirements to tasks and runs
    const forwardPipeline = [
      { $match: { req_id: { $in: reqIds } } },

      {
        $lookup: {
          from: 'commits',
          let: { rid: '$req_id' },
          pipeline: [
            { $match: { $expr: { $in: ['$$rid', { $ifNull: ['$linked_req_ids', []] }] } } },
          ],
          as: 'commits',
        },
      },

      {
        $lookup: {
          from: 'builds',
          let: { hashes: { $map: { input: '$commits', as: 'c', in: '$$c.commit_hash' } } },
          pipeline: [
            {
              $match: {
                $expr: {
                  $gt: [
                    { $size: { $setIntersection: [{ $ifNull: ['$commit_hashes', []] }, '$$hashes'] } },
                    0,
                  ],
                },
              },
            },
          ],
          as: 'builds',
        },
      },

      {
        $lookup: {
          from: 'projects',
          let: { tags: { $map: { input: '$builds', as: 'b', in: '$$b.version_tag' } } },
          pipeline: [
            { $match: { $expr: { $in: ['$software_baseline_version', '$$tags'] } } },
          ],
          as: 'projects',
        },
      },

      {
        $lookup: {
          from: 'tasks',
          let: { pids: { $map: { input: '$projects', as: 'p', in: '$$p.project_id' } } },
          pipeline: [
            { $match: { $expr: { $in: ['$project_id', '$$pids'] } } },
          ],
          as: 'tasks',
        },
      },

      {
        $lookup: {
          from: 'runs',
          let: { tids: { $map: { input: '$tasks', as: 't', in: '$$t.task_id' } } },
          pipeline: [
            { $match: { $expr: { $in: ['$task_id', '$$tids'] } } },
          ],
          as: 'runs',
        },
      },

      {
        $group: {
          _id: null,
          requirements: {
            $push: { req_id: '$req_id', description: '$description', asil_level: '$asil_level' },
          },
          tasks: { $push: '$tasks' },
          runs: { $push: '$runs' },
        },
      },

      {
        $project: {
          _id: 0,
          requirements: 1,
          tasks: {
            $reduce: {
              input: '$tasks',
              initialValue: [] as unknown[],
              in: { $concatArrays: ['$$value', '$$this'] },
            },
          },
          runs: {
            $reduce: {
              input: '$runs',
              initialValue: [] as unknown[],
              in: { $concatArrays: ['$$value', '$$this'] },
            },
          },
        },
      },
    ];

    const [forwardResult] = await Requirement.aggregate(forwardPipeline);

    res.json({
      trace_type: 'impact',
      source_issue: { issue_id, severity: backwardResult.severity, status: backwardResult.status },
      impacted_requirements: forwardResult?.requirements ?? [],
      affected_tasks: (forwardResult?.tasks ?? []).map((t: Record<string, unknown>) => ({
        task_id: t.task_id,
        name: t.name,
        task_type: t.task_type,
        status: t.status,
      })),
      affected_runs: (forwardResult?.runs ?? []).map((r: Record<string, unknown>) => ({
        run_id: r.run_id,
        task_id: r.task_id,
        status: r.status,
      })),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});

/**
 * Coverage: requirements with at least one linked commit that has at least one linked run
 */
router.get('/trace/coverage', async (_req: Request, res: Response) => {
  try {
    const totalResult = await Requirement.countDocuments();

    const coveragePipeline = [
      // Find commits with at least one linked requirement
      {
        $match: {
          linked_req_ids: { $exists: true, $not: { $size: 0 } },
        },
      },

      // For each commit, check if any run used a build containing this commit
      {
        $lookup: {
          from: 'builds',
          let: { ch: '$commit_hash' },
          pipeline: [
            { $match: { $expr: { $in: ['$$ch', { $ifNull: ['$commit_hashes', []] }] } } },
            { $limit: 1 },
          ],
          as: 'matching_builds',
        },
      },

      { $match: { 'matching_builds.0': { $exists: true } } },

      {
        $lookup: {
          from: 'projects',
          let: { tags: { $map: { input: '$matching_builds', as: 'b', in: '$$b.version_tag' } } },
          pipeline: [
            { $match: { $expr: { $in: ['$software_baseline_version', '$$tags'] } } },
            { $limit: 1 },
          ],
          as: 'matching_projects',
        },
      },

      { $match: { 'matching_projects.0': { $exists: true } } },

      {
        $lookup: {
          from: 'tasks',
          let: { pids: { $map: { input: '$matching_projects', as: 'p', in: '$$p.project_id' } } },
          pipeline: [
            { $match: { $expr: { $in: ['$project_id', '$$pids'] } } },
            { $limit: 1 },
          ],
          as: 'matching_tasks',
        },
      },

      { $match: { 'matching_tasks.0': { $exists: true } } },

      {
        $lookup: {
          from: 'runs',
          let: { tids: { $map: { input: '$matching_tasks', as: 't', in: '$$t.task_id' } } },
          pipeline: [
            { $match: { $expr: { $in: ['$task_id', '$$tids'] } } },
            { $limit: 1 },
          ],
          as: 'matching_runs',
        },
      },

      { $match: { 'matching_runs.0': { $exists: true } } },

      // Unwind linked_req_ids to get distinct covered requirement IDs
      { $unwind: '$linked_req_ids' },
      { $group: { _id: '$linked_req_ids' } },
      { $count: 'covered' },
    ];

    const [coverageResult] = await Commit.aggregate(coveragePipeline);

    const covered = coverageResult?.covered ?? 0;
    const percentage = totalResult > 0 ? Math.round((covered / totalResult) * 10000) / 100 : 0;

    res.json({
      total_requirements: totalResult,
      covered_requirements: covered,
      coverage_percentage: percentage,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});

export default router;
