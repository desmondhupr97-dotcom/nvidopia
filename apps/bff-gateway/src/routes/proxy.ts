import { Router, type Request } from 'express';
import { createProxyMiddleware, type Options } from 'http-proxy-middleware';
import type { ClientRequest } from 'node:http';

const router = Router();

function envPort(name: string, fallback: number): number {
  return Number(process.env[name]) || fallback;
}

function serviceUrl(urlEnv: string, portEnv: string, fallbackPort: number): string {
  return process.env[urlEnv] ?? `http://localhost:${envPort(portEnv, fallbackPort)}`;
}

function reattachBody(proxyReq: ClientRequest, req: Request): void {
  const body = (req as Request & { body?: unknown }).body;
  if (body && typeof body === 'object' && Object.keys(body).length > 0) {
    const data = JSON.stringify(body);
    proxyReq.setHeader('Content-Type', 'application/json');
    proxyReq.setHeader('Content-Length', Buffer.byteLength(data));
    proxyReq.write(data);
  }
}

function proxyOpts(target: string, upstreamBasePath: string): Options {
  return {
    target,
    changeOrigin: true,
    pathRewrite: (path) => `${upstreamBasePath}${path}`,
    on: {
      proxyReq: reattachBody as (...args: unknown[]) => void,
      error(err, _req, res) {
        console.error(`[proxy] ${target} error:`, err.message);
        if ('writeHead' in res && typeof res.writeHead === 'function') {
          (res as any).status?.(502).json?.({ error: 'Bad gateway' });
        }
      },
    },
  };
}

const releaseManagerUrl = () => serviceUrl('RELEASE_MANAGER_URL', 'RELEASE_MANAGER_PORT', 3010);
const fleetManagerUrl   = () => serviceUrl('FLEET_MANAGER_URL', 'FLEET_MANAGER_PORT', 3020);
const issueWorkflowUrl  = () => serviceUrl('ISSUE_WORKFLOW_URL', 'ISSUE_WORKFLOW_PORT', 3030);
const traceabilityUrl   = () => serviceUrl('TRACEABILITY_URL', 'TRACEABILITY_PORT', 3040);
const kpiEngineUrl      = () => serviceUrl('KPI_ENGINE_URL', 'KPI_ENGINE_PORT', 3050);

router.use('/api/projects', createProxyMiddleware(proxyOpts(releaseManagerUrl(), '/projects')));
router.use('/api/tasks',    createProxyMiddleware(proxyOpts(releaseManagerUrl(), '/tasks')));

router.use('/api/runs',     createProxyMiddleware(proxyOpts(fleetManagerUrl(), '/runs')));
router.use('/api/vehicles', createProxyMiddleware(proxyOpts(fleetManagerUrl(), '/vehicles')));

router.use('/api/issues',   createProxyMiddleware(proxyOpts(issueWorkflowUrl(), '/api/issues')));

router.use('/api/traceability', createProxyMiddleware(proxyOpts(traceabilityUrl(), '/api/trace')));

router.use('/api/kpi',      createProxyMiddleware(proxyOpts(kpiEngineUrl(), '/kpi')));

export default router;
