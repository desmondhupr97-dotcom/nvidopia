import { Router, Request, Response } from 'express';
import { Vehicle } from '../models/vehicle.model.js';

const router = Router();

router.get('/vehicles', async (req: Request, res: Response) => {
  try {
    const filter: Record<string, unknown> = {};
    if (req.query.current_status) filter.current_status = req.query.current_status;
    if (req.query.vehicle_platform) filter.vehicle_platform = req.query.vehicle_platform;

    const vehicles = await Vehicle.find(filter).sort({ updated_at: -1 });
    res.json(vehicles);
  } catch (err) {
    res.status(500).json({ error: 'Failed to list vehicles', detail: String(err) });
  }
});

router.get('/vehicles/:vin', async (req: Request, res: Response) => {
  try {
    const vehicle = await Vehicle.findOne({ vin: req.params.vin });
    if (!vehicle) {
      res.status(404).json({ error: 'Vehicle not found' });
      return;
    }
    res.json(vehicle);
  } catch (err) {
    res.status(500).json({ error: 'Failed to get vehicle', detail: String(err) });
  }
});

export default router;
