import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: true })
export class UpstoxAccount extends Document {
  declare _id: Types.ObjectId;
  @Prop({ required: true }) name: string;
  @Prop({ required: true }) apiKey: string;
  @Prop({ required: true }) clientId: string;
  @Prop({ required: true }) clientSecret: string;
  @Prop({ required: true }) redirectUri: string;
  @Prop() userId?: string;
  @Prop() accessToken?: string;
  @Prop() refreshToken?: string;
  @Prop() tokenExpiry?: Date;
  @Prop() authCode?: string;
}

export const UpstoxAccountSchema = SchemaFactory.createForClass(UpstoxAccount);
