import { Schema } from 'mongoose';

export interface IGpsCoordinates {
  lat: number;
  lng: number;
}

export const GpsCoordinatesSchema = new Schema<IGpsCoordinates>(
  { lat: { type: Number }, lng: { type: Number } },
  { _id: false },
);
