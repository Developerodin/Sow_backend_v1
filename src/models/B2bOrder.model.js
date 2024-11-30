import  mongoose  from "mongoose";

const orderSchema = mongoose.Schema(
    {
        orderNo : {
            type : String,
            required : true,
            unique : true,
        },
        category : {
            type: mongoose.Schema.Types.ObjectId,
            ref : 'Category',
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
            type: mongoose.Schema.Types.ObjectId,
            ref : 'SubCategory',
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
        photos : {
            type : String,
            required : false,
        },
        orderStatus : {
            type : String,
            required : true,
            enum : ['Pending', 'Accepted', 'Rejected', 'Completed'],
            default : 'Pending',
        },
    },
    {
        timestamps : true,
    }

);
orderSchema.pre('save', async function(next) {
    if (!this.orderNo) {
      // Generate a unique orderNo based on the current timestamp and a random number
      const timestamp = Date.now();
      const randomSuffix = Math.floor(1000 + Math.random() * 9000); // Random 4-digit number
      this.orderNo = `ORD-${timestamp}-${randomSuffix}`;
    }
    next();
  });
const Order = mongoose.model('Order', orderSchema);

export default Order;