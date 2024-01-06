const crypto = require('crypto');
const { promisify } = require('util');
const jwt = require('jsonwebtoken');
const User = require('../models/userModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const sendEmail = require('../utils/email');

const signToken = id => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN
  });
};

const createSendToken = (user, statusCode, res) => {
  const token = signToken(user._id);

  const cookieOptions = {//used in res.cookie below as the third argument
    expires: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000 //convert to milliseconds: day to hours to minutes to seconds to milliseconds
    ),
    //secure: true, asign this only when in production
    httpOnly: true
  };
  if (process.env.NODE_ENV === 'production') cookieOptions.secure = true; //adding the secure property/value to cookieOptions

            //name  token   options (see above)
  res.cookie('jwt', token, cookieOptions); //assigns name, token and options to the cookie

  // Remove password from output
  //user.password = undefined; see userSchema.methods.toJSON on userModel

  res.status(statusCode).json({
    status: 'success',
    token,
    data: {
      user
    }
  });
};

exports.signup = catchAsync(async (req, res, next) => {
  const newUser = await User.create({
    name: req.body.name,
    email: req.body.email,
    password: req.body.password,
    passwordConfirm: req.body.passwordConfirm
  });

  createSendToken(newUser, 201, res);
});

exports.login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;

  // 1) Check if email and password exist
  if (!email || !password) {
    return next(new AppError('Please provide email and password!', 400));
  }
  // 2) Check if user exists && password is correct
  const user = await User.findOne({ email }).select('+password');

  if (!user || !(await user.correctPassword(password, user.password))) {
    return next(new AppError('Incorrect email or password', 401));
  }

  // 3) If everything ok, send token to client
  createSendToken(user, 200, res);
});

exports.protect = catchAsync(async (req, res, next) => {
  // 1) Getting token and check of it's there
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return next(
      new AppError('You are not logged in! Please log in to get access.', 401)
    );
  }

  // 2) Verification token
  const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);

  // 3) Check if user still exists
  const currentUser = await User.findById(decoded.id);
  if (!currentUser) {
    return next(
      new AppError(
        'The user belonging to this token does no longer exist.',
        401
      )
    );
  }

  // 4) Check if user changed password after the token was issued
  if (currentUser.changedPasswordAfter(decoded.iat)) {
    return next(
      new AppError('User recently changed password! Please log in again.', 401)
    );
  }

  // GRANT ACCESS TO PROTECTED ROUTE
  req.user = currentUser;
  next();
});

exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    // roles ['admin', 'lead-guide']. role='user'
    if (!roles.includes(req.user.role)) {
      return next(
        new AppError('You do not have permission to perform this action', 403)
      );
    }

    next();
  };
};


//* Note for forgotPassword's user.save({ validateBeforeSave: false }) vs resetPassword's user.save()
/*
See the docs for Document.prototype.save() by default runs the validators on all modified and required fields. 
But since we excluded password and passwordConfirm fields from the returned results by specifying 
select: false in our schema, we encountered a problem, 
as both of these fields are required: required: [true, 'Password is required'], but not present.
As we never define those fields before calling .save(), the validation fails.

On the contrary, when calling resetPassword, we explicitly set both the user.password & user.passwordConfirm fields, 
so the validation passes.

There are 2 simple solutions to our problem. 
We can either set validateBeforeSave: false and completely skip validation, or 
even better, we can use validateModifiedOnly: true, to only validate modified fields
*/
exports.forgotPassword = catchAsync(async (req, res, next) => {
  // 1) Get user based on POSTed email
  const user = await User.findOne({ email: req.body.email });
  if (!user) {
    return next(new AppError('There is no user with email address.', 404));
  }

  // 2) Generate the random reset token
  const resetToken = user.createPasswordResetToken();
  await user.save({ validateBeforeSave: false });

  // 3) Send it to user's email
  const resetURL = `${req.protocol}://${req.get(
    'host'
  )}/api/v1/users/resetPassword/${resetToken}`;

  const message = `Forgot your password? Submit a PATCH request with your new password and passwordConfirm to: ${resetURL}.\nIf you didn't forget your password, please ignore this email!`;

  try {
    await sendEmail({
      email: user.email,
      subject: 'Your password reset token (valid for 30 min)',
      message
    });

    res.status(200).json({
      status: 'success',
      message: 'Token sent to email!'
    });
  } catch (err) {
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save({ validateBeforeSave: false });

    return next(
      new AppError('There was an error sending the email. Try again later!'),
      500
    );
  }
});

/*
ResetToken:  {
  resetToken: 'ff28de5d96e68e6b91bc54d77475b548c5b14c508cb0a13322e938ea5ab6221e' //* unencrypted sent in url
}
this.passwordResetToken 1cc12ecbce7124c84af3b84a2546bcffe611ac2b90f7594004bfadb5788bac3f //* encrypted
*/
exports.resetPassword = catchAsync(async (req, res, next) => {
  // 1.a)  hash unencrypted token passed in the request so we can compare with database's hashed version
  const hashedToken = crypto
    .createHash('sha256')
    .update(req.params.token)
    .digest('hex');
  //1.b) Get user based on the hashed token
  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() } //mongodb way to do a comparison
  });

  // 2.a) If token has not expired, and there is user, set the new password
  if (!user) {
    return next(new AppError('Token is invalid or has expired', 400));
  }
  //2.b set user properties
  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  //2.c // commit changes to db
  await user.save(); // leave validator on (set to true by default in the userModel)

  // 3) Update changedPasswordAt property for the user
  // 4) Log the user in, send JWT
  createSendToken(user, 200, res);
});

/*
Explanation of 2)
for the following code imagine a user has entered his current password and
new password into a form (password, confirmPassword fields).
We need to check that the current password was entered correctly before
continuing. We use a model method correctPassword(candidatePassword, userPassword)
where the wording of variables do not match what is being done in this case. 
passwordCurrent is not a candidatePassword.
But commparing two passwords to determine whether they match is accomplished.
*/
exports.updatePassword = catchAsync(async (req, res, next) => {
  // 1) Get user from collection - the user has already logged in so the we have access to req.user.id 
  const user = await User.findById(req.user.id).select('+password'); //get id + password (not included in the request by default)

  // 2) Check if POSTed current password is correct
  if (!(await user.correctPassword(req.body.passwordCurrent, user.password))) {
    return next(new AppError('Your current password is wrong.', 401));
  }
  console.log('reg.body: ', req.body)

  // 3) If so, update password
  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  await user.save();
  // User.findByIdAndUpdate will NOT work as intended!

  // 4) Log user in, send JWT
  createSendToken(user, 200, res);
});