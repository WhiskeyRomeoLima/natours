const mongoose = require('mongoose')
const crypto = require('crypto')
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
        role: {
            type: String,
            enum: ['user', 'guide', 'lead-guide', 'admin'],
            default: 'user'
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
        passwordChangedAt: Date,
        passwordResetToken: String,
        passwordResetExpires: Date,
        active: {
          type: Boolean,
          default: true,
          select: false
        }   
    }) //*end model


//create a middleware to run which checks if the password has been modified
//If modified re-hash the password, else just run next
userSchema.pre('save', async function(next) {
    if (!this.isModified('password')) return next()
    this.password = await bcrypt.hash(this.password, 12,) //12 is the salt?
    this.passwordConfirm = undefined //prevents saving this to the database
    next()
})



userSchema.pre('save', function(next) {
    if (!this.isModified('password') || this.isNew) return next();
  
    this.passwordChangedAt = Date.now() - 1000;
    next();
  });
  
  //query middleware use with commands that start with find
  //limits results to those user who are active in the database
  userSchema.pre(/^find/, function(next) {
    // this points to the current query
    this.find({ active: { $ne: false } });
    next();
  });

  //instance method that removes password from the response (such as in signup)
  userSchema.methods.toJSON = function() {
    const sentUserData = this.toObject();
   console.log(sentUserData)
    delete sentUserData.password;
    console.log(sentUserData)
    return sentUserData;
  };
//instance method for comparing incoming password to the saved password
//because select: false is set for the password property (see above), the password is not available from the model
//so we pass in the userPassword
userSchema.methods.correctPassword = async function(candidatePassword, userPassword){
    return await bcrypt.compare(candidatePassword, userPassword)
}

userSchema.methods.changedPasswordAfter = function(JWTTimestamp) {
    if (this.passwordChangedAt) {
      const changedTimestamp = parseInt(
        this.passwordChangedAt.getTime() / 1000, 
        10
      );
    // token issued at time = earlier time - password changed at time = later time    --> 100ms < 200ms = true
    // token issued at time = later time   - password changed at time = eariler time  --> 300ms < 200ms = false
      return JWTTimestamp < changedTimestamp;
    }
  
    // False means NOT changed
    return false
  }

  userSchema.methods.createPasswordResetToken = function() {
    const resetToken = crypto.randomBytes(32).toString('hex') //sent to user as temp password to reset password
    
    this.passwordResetToken = crypto.createHash('sha256').update(resetToken).digest('hex')
    
    console.log({resetToken}, this.passwordResetToken)
    
    this.passwordResetExpires = Date.now() + 30 * 60 *1000
    
console.log('ResetToken: ', {resetToken})
console.log('this.passwordResetToken', this.passwordResetToken)

    return resetToken
  }

//create model out of schema
const User = mongoose.model('User', userSchema)

module.exports = User

//* --------------------------------------------------------------------------------------
//*Simple explanation of password reset functionality
/*
code to generate a hashed password 72 characters long
node -e "console.log(require('crypto').randomBytes(4).toString('hex'));"

58 upvotes
Nejc · Lecture 135 · 1 year ago
Here's the simplified summary of what's going on in this lecture:

1. User forgot / wants to change his password

2. We create a new, temporary password for the user using node's crypto module:

const resetToken = crypto.randomBytes(36).toString('hex');
3. This creates a 72 characters long, cryptographically strong (very random) password using hexadecimal encoding (numbers 0-9, letters A-F). Try running this in the terminal to understand the returned value:

node -e "console.log(require('crypto').randomBytes(4).toString('hex'));"

4. We create the hashed version of this password using the crypto module's createHash function, since we never want to store the plain text password in the database.

5. We chose "sha256" hashing function, which is a very fast operation (as opposed to bcrypt's slow hashing function), which is why we don't need to do this operation asynchronously, as it takes less than a millisecond to complete. The downside to this is that possible attackers can compare our hash to a list of commonly used passwords a lot more times in a given time frame then if using bcrypt, which is a slow operation. So you can do millions of password checks in the same amount of time that it takes to make 1 check using bcrypt. However, this is not a problem here as: a) we used a very long and very random password (as opposed to user generated passwords, which usually have meaning and are far from random) and b) our password is only valid for 10 minutes, so there is literally zero chance for the attacker to guess the password in that short amount of time.

6. We send a plain-text version of our password back to the user so he/she can use it to log-in for the next 10 minutes.

And that's it for this lesson...

*/