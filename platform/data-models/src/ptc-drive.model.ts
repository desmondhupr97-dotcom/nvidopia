import { Schema, model, Document, type Model } from 'mongoose';

export interface IPtcDrive {
  drive_id: string;
  car_id: string;
  build_id: string;
  tag_id: string;
  date: Date;
  start_time: Date;
  end_time: Date;
  mileage_km: number;
  xl_events: number;
  l_events: number;
  hotline_count: number;
  route?: string;

  road_type?: 'Highway' | 'Urban' | 'Ramp' | 'Rural';

  l2pp_mileage?: number;
  l2p_mileage?: number;
  acc_lk_mileage?: number;
  acc_mileage?: number;
  manual_mileage?: number;
  city_mileage?: number;
  highway_mileage?: number;
  ramp_mileage?: number;
  rural_road_mileage?: number;

  toll_station_count?: number;
  intersection_count?: number;
  tfl_count?: number;
  left_turn_count?: number;
  right_turn_count?: number;

  safety_takeover_count?: number;
  silc_miss_route_count?: number;
  wobble_count?: number;
  ghost_brake_count?: number;
  gb_harsh_count?: number;
  dangerous_lc_count?: number;
  lane_drift_count?: number;
  lateral_position_count?: number;
  atca_fn_count?: number;
  atca_fp_count?: number;

  xl_longitudinal_count?: number;
  l_longitudinal_count?: number;
  ml_longitudinal_count?: number;
  m_longitudinal_count?: number;
  xl_lateral_count?: number;
  l_lateral_count?: number;
  ml_lateral_count?: number;

  entry_ramp_attempts?: number;
  entry_ramp_successes?: number;
  exit_ramp_attempts?: number;
  exit_ramp_successes?: number;

  created_at?: Date;
}

export type PtcDriveDocument = IPtcDrive & Document;

const PtcDriveSchema = new Schema<PtcDriveDocument>(
  {
    drive_id: { type: String, unique: true, required: true },
    car_id: { type: String, required: true, ref: 'PtcCar' },
    build_id: { type: String, required: true, ref: 'PtcBuild' },
    tag_id: { type: String, required: true, ref: 'PtcTag' },
    date: { type: Date, required: true },
    start_time: { type: Date, required: true },
    end_time: { type: Date, required: true },
    mileage_km: { type: Number, default: 0 },
    xl_events: { type: Number, default: 0 },
    l_events: { type: Number, default: 0 },
    hotline_count: { type: Number, default: 0 },
    route: { type: String },

    road_type: { type: String, enum: ['Highway', 'Urban', 'Ramp', 'Rural'] },

    l2pp_mileage: { type: Number, default: 0 },
    l2p_mileage: { type: Number, default: 0 },
    acc_lk_mileage: { type: Number, default: 0 },
    acc_mileage: { type: Number, default: 0 },
    manual_mileage: { type: Number, default: 0 },
    city_mileage: { type: Number, default: 0 },
    highway_mileage: { type: Number, default: 0 },
    ramp_mileage: { type: Number, default: 0 },
    rural_road_mileage: { type: Number, default: 0 },

    toll_station_count: { type: Number, default: 0 },
    intersection_count: { type: Number, default: 0 },
    tfl_count: { type: Number, default: 0 },
    left_turn_count: { type: Number, default: 0 },
    right_turn_count: { type: Number, default: 0 },

    safety_takeover_count: { type: Number, default: 0 },
    silc_miss_route_count: { type: Number, default: 0 },
    wobble_count: { type: Number, default: 0 },
    ghost_brake_count: { type: Number, default: 0 },
    gb_harsh_count: { type: Number, default: 0 },
    dangerous_lc_count: { type: Number, default: 0 },
    lane_drift_count: { type: Number, default: 0 },
    lateral_position_count: { type: Number, default: 0 },
    atca_fn_count: { type: Number, default: 0 },
    atca_fp_count: { type: Number, default: 0 },

    xl_longitudinal_count: { type: Number, default: 0 },
    l_longitudinal_count: { type: Number, default: 0 },
    ml_longitudinal_count: { type: Number, default: 0 },
    m_longitudinal_count: { type: Number, default: 0 },
    xl_lateral_count: { type: Number, default: 0 },
    l_lateral_count: { type: Number, default: 0 },
    ml_lateral_count: { type: Number, default: 0 },

    entry_ramp_attempts: { type: Number, default: 0 },
    entry_ramp_successes: { type: Number, default: 0 },
    exit_ramp_attempts: { type: Number, default: 0 },
    exit_ramp_successes: { type: Number, default: 0 },

    created_at: { type: Date, default: Date.now },
  },
  { collection: 'ptc_drives' },
);

PtcDriveSchema.index({ car_id: 1, build_id: 1, tag_id: 1 });
PtcDriveSchema.index({ date: 1 });
PtcDriveSchema.index({ build_id: 1 });
PtcDriveSchema.index({ tag_id: 1 });
PtcDriveSchema.index({ car_id: 1 });

export const PtcDrive: Model<PtcDriveDocument> = model<PtcDriveDocument>(
  'PtcDrive',
  PtcDriveSchema,
);
