import mongoose from 'mongoose';

const notificationSchema = mongoose.Schema(
  {
    notification: {
      type: String,
      required: true,
    },
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'B2COrder',
      required: true,
    },
    orderBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'B2CUser',
      required: true,
    },
    orderTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'B2BUser',
      required: false,
    },
    orderNo: {
      type: String,
      required: true,
    },
    isReadByOrderBy: {
      type: Boolean,
      default: false,
    },
    isReadByOrderTo: {
      type: Boolean,
      default: false,
    },
    orderStatus :{
        type: String,
    },
    totalPrice:{
        type: String
    }
  },
  { timestamps: true }
);

const B2CNotification = mongoose.model('B2CNotification', notificationSchema);

export default B2CNotification;
