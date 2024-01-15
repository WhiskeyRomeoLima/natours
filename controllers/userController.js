const User = require('../models/userModel'); // imports tourModel.js 
const catchAsync = require('../utils/catchAsync');
const AppError = require('./../utils/appError');
const factory = require('./handlerFactory')

// The rest parameter syntax allows a function to accept an indefinite number of single arguments which then are grouped into an array, providing a way to represent variadic functions in JavaScript.
// A function definition's last parameter can be prefixed with ..., which will cause all remaining (user supplied) parameters to be placed within an Array object.
const filterObj = (obj, ...allowedFields) => { //allowedFields now contains ['name', 'email']
    const newObj = {};
    //Object.keys() returns an array of keys. Then loop thru and add each of the allowed keys to newObj
    Object.keys(obj).forEach(el => {
      if (allowedFields.includes(el)) newObj[el] = obj[el];
    });
 
    return newObj; 
  };

  exports.getMe = (req, res, next) => {
    req.params.id = req.user.id
    next()
  }

  exports.updateMe = catchAsync(async (req, res, next) => {
    //We need to use findByIdAndUpdate(id, object containing the fields to be updated)
    //since we want to work with any number and combination of fields (rest operator), we create the 
    //filterBody function (see above)

    // 1) Create error if user POST contains password data
    if (req.body.password || req.body.passwordConfirm) {
      return next(
        new AppError(
          'This route is not for password updates. Please use /updateMyPassword.',
          400
        )
      );
    }
  
    // 2) Filter out unwanted fields names that are not to be updated
    const filteredBody = filterObj(req.body, 'name', 'email');
  
    // 3) Update user document (findByIDAndUpdate will save the document)
    //The findByIdAndUpdate() function is used to find a matching document, 
    //updates it according to the update arg, passing any options, and 
    //returns the found document (if any) to the callback.
    const updatedUser = await User.findByIdAndUpdate(req.user.id, filteredBody, {
      new: true,
      runValidators: true
    });
  
    res.status(200).json({
      status: 'success',
      data: {
        user: updatedUser
      }
    });
  });

  exports.deleteMe = catchAsync(async (req, res, next) => {
    await User.findByIdAndUpdate(req.user.id, { active: false }); //see, in user model, userSchema.pre(/^find/, function(next) ...
  
    res.status(204).json({
      status: 'success',
      data: null
    });
  })



exports.createUser = (req, res) => {
    res.status(500).json({
        status: 'error',
        message: 'This route is not defined. Please use /signup instead.'
    })
}

exports.getUser = factory.getOne(User)
exports.getAllUsers = factory.getAll(User)

//Do NOT update passwords with this
exports.updateUser = factory.updateOne(User)
exports.deleteUser = factory.deleteOne(User)
// exports.deleteUser = (req, res) => {
//     res.status(500).json({
//         status: 'error',
//         message: 'This route is not implemented yet.'
//     })
// }

