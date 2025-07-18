import mongoose from 'mongoose';

const orderSchema = mongoose.Schema(
    {
        orderNo : {
            type : String,
            required : false,
            unique : true,
        },
        category: {
            type : String,
            required : true,
          },
        orderBy :{
            type: mongoose.Schema.Types.ObjectId,
            ref :'B2BUser',
            required : true,  
        },
        orderTo : {
            type: mongoose.Schema.Types.ObjectId,
            ref : 'B2BUser',
            required : true,
        },
        location :{
            type : mongoose.Schema.Types.ObjectId,
            ref : 'B2BAddress',
            required : true,
        },
        subCategory: {
            type : String,
            required : true,
        },
        weight : {
            type : String,
            required : true,
        },
        unit : {
            type : String,
            required : true,
        },
        notes : {
            type : String,
            required : false,
        },
        value : {
            type : Number,
            required : true,
        },
        totalPrice : {
            type : Number,
            required : true,
        },
        photos: {
            type: [String], // Array of photo URLs
            required: false,
            default: []
        },
        photoKeys: {
            type: [String], // Array of photo keys for S3
            required: false,
            default: []
        },
        orderStatus : {
            type : String,
            required : true,
            enum : ['New','Pending', 'Rejected', 'Completed','Cancelled'],
            default : 'New',
        },
        otp: {
            type: Number,
            required: true,
          }
    },
    {
        timestamps : true,
    }

);
orderSchema.pre('save', async function(next) {
    if (!this.orderNo) {
     
      const timestamp = Date.now();
      const randomSuffix = Math.floor(1000 + Math.random() * 9000);
      this.orderNo = `ORD-${timestamp}-${randomSuffix}`;
    }
    next();
  });
const Order = mongoose.model('Order', orderSchema);

export default Order;