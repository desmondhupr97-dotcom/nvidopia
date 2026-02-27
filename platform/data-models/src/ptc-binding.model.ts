import { Schema, model, Document, type Model } from 'mongoose';

export const BINDING_STATUS = ['Draft', 'Published'] as const;
export type BindingStatus = (typeof BINDING_STATUS)[number];

export const DESELECT_REASON_PRESETS = [
  '数据异常',
  '重复',
  '不相关',
  '设备故障',
  '其他',
] as const;
export type DeselectReasonPreset = (typeof DESELECT_REASON_PRESETS)[number];

export interface IBindingDrive {
  drive_id: string;
  selected: boolean;
  deselect_reason_preset?: string;
  deselect_reason_text?: string;
}

export interface IBindingCar {
  car_id: string;
  drives: IBindingDrive[];
}

export interface IFilterCriteria {
  builds: string[];
  cars: string[];
  tags: string[];
}

export interface IPtcBinding {
  binding_id: string;
  task_id: string;
  status: BindingStatus;
  filter_criteria: IFilterCriteria;
  cars: IBindingCar[];
  created_at: Date;
  updated_at: Date;
}

export type PtcBindingDocument = IPtcBinding & Document;

const BindingDriveSchema = new Schema<IBindingDrive>(
  {
    drive_id: { type: String, required: true },
    selected: { type: Boolean, default: true },
    deselect_reason_preset: { type: String },
    deselect_reason_text: { type: String },
  },
  { _id: false },
);

const BindingCarSchema = new Schema<IBindingCar>(
  {
    car_id: { type: String, required: true },
    drives: { type: [BindingDriveSchema], default: [] },
  },
  { _id: false },
);

const FilterCriteriaSchema = new Schema<IFilterCriteria>(
  {
    builds: { type: [String], default: [] },
    cars: { type: [String], default: [] },
    tags: { type: [String], default: [] },
  },
  { _id: false },
);

const PtcBindingSchema = new Schema<PtcBindingDocument>(
  {
    binding_id: { type: String, unique: true, required: true },
    task_id: { type: String, unique: true, required: true, ref: 'PtcTask' },
    status: { type: String, enum: BINDING_STATUS, default: 'Draft' },
    filter_criteria: { type: FilterCriteriaSchema, default: () => ({}) },
    cars: { type: [BindingCarSchema], default: [] },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    collection: 'ptc_bindings',
  },
);

PtcBindingSchema.index({ task_id: 1 }, { unique: true });
PtcBindingSchema.index({ status: 1 });

export const PtcBinding: Model<PtcBindingDocument> = model<PtcBindingDocument>(
  'PtcBinding',
  PtcBindingSchema,
);
