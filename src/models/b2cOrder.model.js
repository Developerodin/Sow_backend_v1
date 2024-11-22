import  mongoose  from "mongoose";

const b2cOrderSchema = mongoose.Schema(
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
            ref :'B2CUser',
            required : true,  
        },
        orderTo : {
            type: mongoose.Schema.Types.ObjectId,
            ref : 'B2BUser',
            required : true,
        },
        location :{
            type : mongoose.Schema.Types.ObjectId,
            ref : 'B2CAddress',
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

const B2COrder = mongoose.model('B2COrder', b2cOrderSchema);

export default B2COrder;