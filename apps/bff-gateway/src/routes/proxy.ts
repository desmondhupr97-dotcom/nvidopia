import { Router } from 'express';
import { createProxyMiddleware, Options } from 'http-proxy-middleware';

const router = Router();

function envPort(name: string, fallback: number): number {
  return Number(process.env[name]) || fallback;
}

function proxyOpts(target: string): Options {
  return {
    target,
    changeOrigin: true,
    pathRewrite: { '^/api': '' },
    on: {
      error(err, _req, res) {
        console.error(`[proxy] ${target} error:`, err.message);
        if ('writeHead' in res && typeof res.writeHead === 'function') {
          (res as any).status?.(502).json?.({ error: 'Bad gateway' });
        }
      },
    },
  };
}

const releaseManagerUrl = () => `http://localhost:${envPort('RELEASE_MANAGER_PORT', 3010)}`;
const fleetManagerUrl   = () => `http://localhost:${envPort('FLEET_MANAGER_PORT', 3020)}`;
const issueWorkflowUrl  = () => `http://localhost:${envPort('ISSUE_WORKFLOW_PORT', 3030)}`;
const traceabilityUrl   = () => `http://localhost:${envPort('TRACEABILITY_PORT', 3040)}`;
const kpiEngineUrl      = () => `http://localhost:${envPort('KPI_ENGINE_PORT', 3050)}`;

router.use('/api/projects', createProxyMiddleware(proxyOpts(releaseManagerUrl())));
router.use('/api/tasks',    createProxyMiddleware(proxyOpts(releaseManagerUrl())));

router.use('/api/runs',     createProxyMiddleware(proxyOpts(fleetManagerUrl())));
router.use('/api/vehicles', createProxyMiddleware(proxyOpts(fleetManagerUrl())));

router.use('/api/issues',   createProxyMiddleware(proxyOpts(issueWorkflowUrl())));

router.use('/api/traceability', createProxyMiddleware(proxyOpts(traceabilityUrl())));

router.use('/api/kpi',      createProxyMiddleware(proxyOpts(kpiEngineUrl())));

export default router;
