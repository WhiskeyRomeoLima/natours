const crypto = require('crypto')
const{ promisify } = require('util')
const User = require('../models/userModel')
const catchAsync = require('../utils/catchAsync')
const jwt = require('jsonwebtoken')
const AppError = require('../utils/appError')
const sendEmail = require('../utils/email')

/*
command line code to generate a secret key
node -e "console.log(require('crypto').randomBytes(64).toString('hex'));"
*/

const signToken = (userId) => {
  return  jwt.sign(
    {id: userId}, //payload
    process.env.JWT_SECRET, //secretOrPrivateKey
    {expiresIn: process.env.JWT_EXPIRES_IN} //options
    ) 
} 

exports.signup = catchAsync( async (req, res, next) => {
        const {name, email, password, passwordConfirm} = req.body
        // Create a new user
        const newUser = await User.create({ //using shortcut object notation where prop name = value name
          role: req.body.role,  
          name,
          email,
          password,
          passwordConfirm,
        });

        //sign(payload: string | object | Buffer, secretOrPrivateKey: null, options?: (jwt.SignOptions & { algorithm: "none"; }) | undefined): string
        const token = signToken(newUser._id)


        res.status(201).json({
            status: 'success',
            token,
            data: {
                user: newUser
            }
        });
});

exports.login = catchAsync( async (req, res, next) => {
    const {email, password} = req.body //this password is the unencrypted password passed in by the user

    //* check if email and password exists
    if (!email || !password) {
      return  next(new AppError('Please provide email and password!', 400))
    }

    //*check if user exists and password is correct
    //password returned is encrypted so the user object includes all properties including the encrypted password
    const user = await User.findOne({email}).select('+password') // use '+' to select additional fields
    
    //recall we defined the the correctPassword function on the user model as an instance method
    //the 'user' variable above is now the current document and the correctPassword instance method is available on all user documents
    //also the value of 'this' points to the current document 
    /*see alternative to the below version (see another refactored version directly below) in comments at bottom of authCrontroller code
        
        const correct = await user.correctPassword(password, user.password) //again password is not encrypted, user.password is
    
        if(!user || !correct) {
            return next(new AppError('Incorrect email or password', 401))
        }
    */

    //refactored from the above commented out code because if user was undefined, the return in the code will not run
    if(!user || !await user.correctPassword(password, user.password)) {
        return next(new AppError('Incorrect email or password', 401)) //unauthorized
    }

    //sign token and send to client
    const token = signToken(user._id)
    res.status(200).json({
        status: 'success',
        token
    })
})

//* check to see if user is logged in
exports.protect = catchAsync( async (req, res, next)=> {
    //* get token and check existance.  
    //From header (authorization: 'Bearer abcdefghijklmnop', ...} (split string into an array using ' ' as the separator)
    let token
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        token = req.headers.authorization.split(' ')[1] //getting the 2nd element = token
        //const is blocked scoped, so token will not be available outside of this block, so we use let
    }
    if (!token) {      //AppError(message, status code)
        return next(new AppError('You are not logged in! Please log in to get access', 401)) //401 unauthorized
    }

    //*verify token -- check if token is modified or expired
    //we promisify the jwt.verify() function (which is synchronous) then call it with (token, process.env.JWT_SECRET)
    const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET)

    //*check if user exists
    const currentUser = await User.findById(decoded.id);
    if (!currentUser) {
      return next(
        new AppError(
          'The user belonging to this token does no longer exist.',
          401
        )
      );
    }
    
    //*check if user changes password after the token was issued
    if (currentUser.changedPasswordAfter(decoded.iat)) {
        return next(
          new AppError('User recently changed password! Please log in again.', 401)
        );
      }
    
      // GRANT ACCESS TO PROTECTED ROUTE - put the entire user on the request
      req.user = currentUser //* critical to enable the restrictTo function below
      next()
}) //end protect


exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    //roles ['admin', 'lead-guide] -- the protect middle ware has already ran and put the user object on the req (see approximately 5 lines up)
    if (!roles.includes(req.user.role)) {
      return next(new AppError('You do not have permission to perform this action.', 403)) //403 = forbidden 
    }
    next()
  }
}

exports.forgotPassword = catchAsync(async (req, res, next) => {
  console.log('In forgotPasword handler')
  
  //*get user based on posted email
  const user = await User.findOne({ email: req.body.email });

  if (!user) {
    return next(new AppError('There is no user with that email address.', 404));
  }
  //*generate a random token via an instance method on the model
  const resetToken = user.createPasswordResetToken();
  await user.save({ validateBeforeSave: false });

  //*send reset link to user's email
  const resetURL = `${req.protocol}://${req.get('host')}/api/v1/users/resetPassword/${resetToken}`
  
  const message = `
  Forgot your password? Submit create a new password and confirm password to: ${resetURL},\n If you didn't forget your password, please ignore this email.`
  
  console.log('before try')
  try {
    await sendEmail({
    email: user.email,
    subject: 'Your password reset token is valid for 10 minutes',
    message
  })

  console.log('Before response')
  
  res.status(200).json({
    status: 'success',
    message: 'Token sent to email'

  })
  console.log('Before catch')
  
  } catch (error) { // to call user.save anytime we modify the document to save to database
      user.passwordResetToken = undefined
      user.passwordResetExpires = undefined
      await user.save({validateBeforeSave: false}) //do not validate because we are not sending all required properties
      return next (new AppError('There was an error sending the email. Try again later!', 500)) //internal server error
  } //end catch

  

}) // end forgotPassword() 

/*
  example user with a password reset token: 
 _id: 6589db223fd8a532f5521898
role:   "user"
active: true
name:  "debby"
email: "debby@home.com"
password: "$2a$12$6E9/OiPPXP.dRXXd3W4nNeLlvumJGw1jjvGKet/Z6FpYHxbCxOUOe"
__v: 0
passwordResetExpires: 2023-12-30T01:02:45.030+00:00
passwordResetToken: "4cd404b8ebf50cdd05be025346e8c8a0b4467ddfecb5221016a7e238af80eb6d"
*/

exports.resetPassword = catchAsync (async (req, res, next) => {
  //* get user based on token -- recall from userRoutes.js: router.patch('/resetPassword/:token', authController.resetPassword)
  const hashedToken = crypto
    .createHash('sha256')
    .update(req.params.token)
    .digest('hex');
  
  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() }
  });
console.log('begin check for user')
  if (!user) {
    return next(new AppError('Token is invalid or has expired', 400))
  }
    user.password = req.body.password
    user.passwordConfirm = req.body.passwordConfirm
    user.passwordResetToken = undefined
    user.passwordResetExpires = undefined
    await user.save(); //we do not want to turn off the validator

  //* Update changedPasswordAt property for the user

  //* Log the user in, send JWT
  //createSendToken(user, 200, res);
  res.status(200).json({
    status: 'success',
    token
})

})
/*

All we have to do is to actually call promisify. 
So promisify(), and then pass the jwt.verify in there. So promisify(jwt.verify),
And so now, promisify(jwt.verify) is a function that we need to call,
which will then return a promise.

So then this (token, process.env.JWT_SECRET) actually  is the call of the function.
And this also will then return a promise,
and so we can await it and store the result into a variable.
const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET)

So that result value of the promise
will actually be the decoded data,
which is the decoded payload from this JSON web token.

const user = await User.findOne({ email }).select('+password');
in the above line of code, we have selected the password field in the 
document so correctPassword function will have access to this.password 
as 'this' refers to the document.

userSchema.methods.verifyPassword = async function(userPassword) {
  return await bcrypt.compare(userPassword, this.password);
 //*versus as done above
                                                     password (unencryped), user.password (encrypted)
userSchema.methods.correctPassword = async function(candidatePassword, userPassword){
    return await bcrypt.compare(candidatePassword, userPassword)
}
}
*/

/*
The async function declaration creates a binding of a new async function to a given name. 
The await keyword is permitted within the function body, enabling asynchronous, 
promise-based behavior to be written in a cleaner style and avoiding 
the need to explicitly configure promise chains.

Adam — Teaching Assistant
13 upvotes
3 years ago
You use an async function when working with Promises in the body of the function.

There are two sets of brackets because this part:

promisify(jwt.verify)
Returns the promisified version of jwt.verify as a function and this part:

(token, process.env.JWT_SECRET)
Executes that function.

//* but this also works
const decoded = await jwt.verify(
    token,
    process.env.JWT_SECRET,
    {}, // passing an empty options object to get to callback
    (err, value) => {
      if (err) {
        return next(new AppError('Error', 401));
      }
      return value;
    }
  );
  Reply by Adam — Teaching Assistant

    Hi Jordan,
    You can certainly use a callback if you prefer. 
    I don't see any compelling reason to choose it over a Promise though.

 //* This is the source of the confusion
@1:20 Jonas says
So you see that this verify here
is actually an asynchronous function.
So it will verify a token, and then after that,
when it's done, it will then call the callback function that we can specify.

Mohamed
4 upvotes
2 years ago
Is there anyone who can explain why we can't use
const decoded = await promisify(jwt.verify(token, process.env.JWT_SECRET));
 
INSTEAD OF
 
const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);
 
I was expecting to pass the token and  the secrete to jwt.verify and then pass the jwt.verify outcome into promisify so turn into a promise.

Now it looks like the promisify takes jwt.verify func without arguments and the  token and secret are just sitting out of any function.


Jerome
5 upvotes
1 year ago
Hi everyone, just wanted to see if my understanding is correct. Would this explanation be right?

The promisify function is used to wrap the jwt.verfiy() function so that 
we can use await on the returned value of the callback function it produces as a 
result of the jwt.verfiy() running.

A Promise is a function that takes another function as an argument/parameter,
 promises can be handled with resolve and reject to process the results of the 
 returned promise (the result of the callback function when it returns the value of its output), 
 
 In javascript version, ES6 an internal method for handling promises was created, to simplify 
 promises, async...await. It functions the same.

Since we've been using async... await throughout the project, 
the promisify function wrapper is used to better match up the processing of the callback function 
to how we have been using it, by turning the callback into a promise, 
which is functionally the same as using async...await.

Pinku
0 upvotes
6 months ago
@Nishant

without a CB as the 3rd parameter jwt.verify will act synchronously
with a CB as the 3rd parameter jwt.verify will act asynchronously
as per my understanding since we are using promisify on jwt.verify(), behind the scenes the asynchronous version is used implicitly ie jwt.verify(token, 'secret', (error, verifiedJWT ) =>{......} ), because promisify only works on functions whose last parameter is a CB following the error first pattern (error, value)=> {...}
so promisify returns a function which then returns a promise (when subsequently called with token and the secret argument) with a resolved value either an error or the value (verifiedJWT)
and we can therefore await it inside a asynchronous function
so if we use const decoded = jwt.verify(token, process.env.JWT_SECRET) in our code , it will also work but then we are running it synchronously, which will block the event loop for a time, however small
so in jonas code we are using the asynchronous version implicitly by promisifying it



*/