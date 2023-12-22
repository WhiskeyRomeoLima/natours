const User = require('../models/userModel'); // imports tourModel.js 
const catchAsync = require('../utils/catchAsync');
const AppError = require('./../utils/appError');

exports.getAllUsers = catchAsync( async (req, res) => {
    const users= await User.find()

    res.status(200).json({
      status: 'success',
      results: users.length,
      data: {
        users
      }
    });
})

exports.getUser= (req, res) => {
    res.status(500).json({
        status: 'error',
        message: 'This route is not implemented yet.'
    })
}

exports.createUser = (req, res) => {
    res.status(500).json({
        status: 'error',
        message: 'This route is not implemented yet.'
    })
}

exports.updateUser = (req, res) => {
    res.status(500).json({
        status: 'error',
        message: 'This route is not implemented yet.'
    })
}

exports.deleteUser = (req, res) => {
    res.status(500).json({
        status: 'error',
        message: 'This route is not implemented yet.'
    })
}