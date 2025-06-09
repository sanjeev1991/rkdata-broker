import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class UpstoxNotification extends Document {
  @Prop({ type: Object })
  payload: Record<string, unknown>;
}

export const UpstoxNotificationSchema =
  SchemaFactory.createForClass(UpstoxNotification);
