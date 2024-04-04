import mongoose, { Schema } from "mongoose"
const roles = ["admin", "user"]
const userSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true
    },
    avatar: {
      type: String,
      required: false,
      default:
        "https://source.boringavatars.com/beam/120/Stefan?colors=264653,2a9d8f,e9c46a",
    },
    role: {
      type: String,
      enum: roles,
      default: "user",
    },
    validated: {
        type: Boolean,
        default: false
    },
    cart: [{ type: Schema.Types.ObjectId, ref: "product" }],
  },
  { collection: "users" }
)

userSchema.pre("save", async function (next) {
  this.avatar = `https://source.boringavatars.com/beam/120/${this.name}?colors=4d9de0,c9e6fe,ee7b30`
  next()
})

export default mongoose.model("User", userSchema)
