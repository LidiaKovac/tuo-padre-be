import mongoose from "mongoose"

const productSchema = new mongoose.Schema(
  {
    prodName: {
      type: String,
      required: false,
    },
    img: {
      type: String,
      required: false,
      default: "http://placehold.it/300",
    },
    price: {
      type: String,
      required: false,
    },
    prodQuantity: {
      type: String,
      required: false,
    },
    store: {
      type: String,
      required: false,
    },
    needsCard: {
      type: Boolean,
      required: true,
      default: false,
    },
    scadenza: {
      type: String,
      required: false,
      default: "00/00/00",
    },
  },
  { collection: "sales" }
)

export default mongoose.model("product", productSchema)
