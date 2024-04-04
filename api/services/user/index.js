//GENERAL
import { Router } from "express"
const userRoute = Router()
import bcrypt from "bcryptjs"
import multer from "multer"
import sgMail from "@sendgrid/mail"
import User from "../../schemas/user.schema.js"
import {
  adminMidd,
  authMidd,
  generateJWT,
  verifyJWT,
} from "../../utils/auth.middlewares.js"
import { Logger } from "../../../shops/logger.js"

// ! /me routes

userRoute.get("/me/cart", authMidd, async (req, res, next) => {
  try {
    const allUsers = await User.findOne({
      email: req.user.email,
    }).populate("cart")
    res.send(allUsers.cart)
  } catch (e) {
    next(e)
  }
})

userRoute.get("/me", authMidd, async (req, res, next) => {
  try {
    res.send(req.user)
  } catch (error) {
    next(error)
  }
})

userRoute.put("/me", authMidd, async (req, res, next) => {
  try {
  } catch (error) {
    next(error)
  }
})
userRoute.delete("/me", authMidd, async (req, res, next) => {
  try {
  } catch (error) {
    next(error)
  }
})
// ! auth routes

userRoute.post(
  "/login",
  multer().fields([{ name: "email" }, { name: "password" }]),
  async ({ body }, res, next) => {
    try {
      let foundUser = await User.findOne({
        email: body.email,
      })
      const matching = await bcrypt.compare(body.password, foundUser.password)
      console.log(matching)
      if (foundUser && matching) {
        const token = await generateJWT({
          lastName: foundUser.lastName,
          email: foundUser.email,
        })
        res
          .set("Access-Control-Expose-Headers", "token")
          .set("token", token)
          .sendStatus(200)
      } else res.sendStatus(404)
    } catch (error) {
      next(error)
    }
  }
)

userRoute.post(
  "/",
  multer().fields([
    { name: "name" },
    { name: "email" },
    { name: "password" },
    { name: "passwordConfirm" },
  ]),
  async (req, res, next) => {
    try {
      if (req.body.password !== req.body.passwordConfirm) {
        res.status(400).send("Passwords don't match!")
      }
      const checkUnique = await User.find({
        email: req.body.email,
      })
      console.log(checkUnique)
      if (checkUnique.length > 0) {
        res.status(400).send("A user with this email already exists.")
      } else {
        await User.create({
          ...req.body,
        })
        // Send verification email
        const token = await generateJWT({
          lastName: req.body.name,
          email: req.body.email,
        })
        const msg = {
          to: req.body.email, // Change to your recipient
          from: "student.io.uni@gmail.com", // Change to your verified sender
          subject: "Verifica il tuo account TuoPadre",
          html: `
          <div style='
          background-color: #fbd0b37c;
          height: 400px;
          margin: 100px;
          box-sizing: border-box;
          padding: 100px;
          font-family: Helvetica, Arial, sans-serif;'>
            <a href='${process.env.URL}user/verify?token=${token}'> Clicca qui per verificare il tuo account TuoPadre </a>
            <br/>
            Oppure, copia e incolla questo link: ${process.env.URL}user/verify?token=${token}

        </div>`,
        }
        await sgMail.send(msg)
        res.status(201).send("User created")
      }
    } catch (e) {
      next(e)
    }
  }
)

userRoute.get("/verify", async (req, res, next) => {
  try {
    const token = req.query.token
    console.log(token)
    if (!token) {
      res.sendStatus(400)
    } else {
      const { email } = await verifyJWT(token)
      await User.findOneAndUpdate({ email }, { validated: true })
      res.redirect(`${process.env.FE_URL}login?token=${token}`)
    }
  } catch (error) {
    Logger.error(error)
    next(error)
  }
})

userRoute.post("/logout", async (req, res, next) => {
  try {
  } catch (e) {
    next(e)
  }
})

//! Admin only routes

userRoute.get("/", [authMidd, adminMidd], async (req, res, next) => {
  try {
    const allUsers = await User.find()
    res.send(allUsers)
  } catch (e) {
    next(e)
  }
})

userRoute.get("/:id", [authMidd, adminMidd], async (req, res, next) => {
  try {
    const selectedUser = await User.findById(req.params.id)
    res.send(selectedUser)
  } catch (e) {
    next(e)
  }
})

userRoute.patch(
  "/:id",
  /* [authMidd, adminMidd], */ async (req, res, next) => {
    try {
      const found = await User.findByIdAndUpdate(req.params.id, req.body, {
        new: true,
      })
      res.send(found)
    } catch (e) {
      next(e)
    }
  }
)
userRoute.delete("/:id", [authMidd, adminMidd], async (req, res, next) => {
  try {
  } catch (e) {
    next(e)
  }
})
export default userRoute
