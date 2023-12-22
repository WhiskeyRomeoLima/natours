const mongoose = require('mongoose')
const slugify = require('slugify')
const validator = require('validator')
const bcrypt = require('bcryptjs')

const userSchema = new mongoose.Schema(
    { //schema object
        name: {
            type: String,
            required: [true, 'Please tell us your name']
        },
        email: {
            type: String,
            required: [true, 'Email is required'],
            unique: true,
            lowercase: true, //simply formats email to lowercase
            validator: [validator.isEmail, 'Please provide a valid email']
        },
        photo: {
            type: String
        },
        password: {
            type: String,
            required: [true, 'Please enter your password'],
            minlength: 8,
            select: false
        },
        passwordConfirm: {
            type: String,
            required: [true, 'Please confirm your password'],
            validate: { 
                //this only works on SAVE we must use save and not findOneandUpdate()
                //keep this in mind when we write the rest of the code throughout the rest of the section
                //and especially for updating
                validator: function(el) {
                    return el === this.password                    
                },
                message: 'Passwords do not match!'
            }
        },
    }
)

//create a middleware to run to check if the password has been modified
//If modified re-hash the password, else just run next
userSchema.pre('save', async function(next) {
    if (!this.isModified('password')) return next()
    this.password = await bcrypt.hash(this.password, 12,) //12 is the salt?
    this.passwordConfirm = undefined //prevents saving this to the database
    next()
})

//create model out of schema
const User = mongoose.model('User', userSchema)

module.exports = User