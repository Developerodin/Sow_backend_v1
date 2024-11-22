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
            ref :'B2Buser',
            required : true,  
        },
        orderTo : {
            type: mongoose.Schema.Types.ObjectId,
            ref : 'B2CUser',
            required : true,
        },
        location :{
            type : String,
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

const Order = mongoose.model('Order', orderSchema);

export default Order;