import mongoose from "mongoose";

const b2cOrderSchema = mongoose.Schema(
  {
    orderNo: {
      type: String,
      required: false,
      unique: true,
    },
    orderBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "B2CUser",
      required: true,
    },
    orderTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "B2BUser",
      required: false,
    },
    location: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "B2CAddress",
      required: true,
    },
    items: [
      {
        category: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Category",
          required: true,
        },
        subCategory: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "SubCategory",
          required: true,
        },
        weight: {
          type: String,
          required: true,
        },
        unit: {
          type: String,
          required: true,
        },
        notes: {
          type: String,
          required: false,
        },
        value: {
          type: Number,
          required: true,
        },
        totalPrice: {
          type: Number,
          required: true,
        },
      },
    ],
    photos: {
      type: String,
      required: false,
    },
    orderStatus: {
      type: String,
      required: true,
      enum: ["New", "Pending", "Rejected", "Completed", "Cancelled"],
      default: "New",
    },
  },
  {
    timestamps: true,
  }
);

b2cOrderSchema.pre("save", async function (next) {
  if (!this.orderNo) {
    const timestamp = Date.now();
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    this.orderNo = `ORD-${timestamp}-${randomSuffix}`;
  }
  next();
});

const B2COrder = mongoose.model("B2COrder", b2cOrderSchema);

export default B2COrder;
