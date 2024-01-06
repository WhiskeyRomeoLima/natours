const catchAsync = require("../utils/catchAsync");
const Review = require('../models/reviewModel')
const AppError = require('../utils/appError');

exports.getAllReviews = catchAsync( async (req, res, next) => {
 const reviews = await Review.find()

   // SEND RESPONSE
   res.status(200).json({
    status: 'success',
    results: reviews.length,
    data: {
     reviews
    }
  });
}) //end catchAsync

exports.createReview = catchAsync( async (req, res, next) => {
    const newReview = await Review.create(req.body)
   
      // SEND RESPONSE
      res.status(201).json({ //201 new document
       status: 'success',
       data: {
        review: newReview
       }
     });
   }) //end createReview, catchAsync