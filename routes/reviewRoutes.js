const express = require('express');
const reviewController = require('../controllers/reviewController');
const authController = require('../controllers/authController');

const router = express.Router();


router.use(authController.protect);

router
    .route('/')
    .get(reviewController.getAllReviews)
    .post(
        authController.protect, 
        //authController.restrictTo('user'), 
        reviewController.createReview)

module.exports = router //remember to mount router