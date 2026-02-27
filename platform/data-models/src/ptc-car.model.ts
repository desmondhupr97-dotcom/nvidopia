import { Schema, model, Document, type Model } from 'mongoose';

export interface IPtcCar {
  car_id: string;
  name: string;
  vin?: string;
  created_at?: Date;
}

export type PtcCarDocument = IPtcCar & Document;

const PtcCarSchema = new Schema<PtcCarDocument>(
  {
    car_id: { type: String, unique: true, required: true },
    name: { type: String, required: true },
    vin: { type: String },
    created_at: { type: Date, default: Date.now },
  },
  { collection: 'ptc_cars' },
);

PtcCarSchema.index({ name: 'text' });

export const PtcCar: Model<PtcCarDocument> = model<PtcCarDocument>(
  'PtcCar',
  PtcCarSchema,
);
