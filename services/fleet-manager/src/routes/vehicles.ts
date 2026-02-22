import { Router } from 'express';
import { Vehicle } from '@nvidopia/data-models';
import { createListHandler, asyncHandler } from '@nvidopia/service-toolkit';

const router = Router();

router.get('/vehicles', createListHandler(Vehicle, {
  allowedFilters: ['current_status', 'vehicle_platform'],
  defaultSort: { updated_at: -1 },
}));

router.get('/vehicles/:vin', asyncHandler(async (req, res) => {
  const vehicle = await Vehicle.findOne({ vin: req.params.vin });
  if (!vehicle) {
    res.status(404).json({ error: 'Vehicle not found' });
    return;
  }
  res.json(vehicle);
}));

export default router;
