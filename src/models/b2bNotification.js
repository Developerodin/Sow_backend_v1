import mongoose from 'mongoose';

const notificationSchema = mongoose.Schema(
  {
    notification: {
      type: String,
      required: true,
    },
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      required: true,
    },
    orderBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'B2BUser',
      required: true,
    },
    orderTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'B2BUser',
      required: true,
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

const Notification = mongoose.model('Notification', notificationSchema);

export default Notification;
