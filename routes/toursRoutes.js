const express = require('express')
const router = express.Router()
const tourController = require('../controllers/tourController')
const authController = require('../controllers/authController')
// const reviewController = require('../controllers/reviewController')
const reviewRouter = require('../routes/reviewRoutes')

//how to get access to the parameters of a request
// router.param('id', (req, res, next, value) => {
//     console.log(`Tour id is: ${value}`)
//     next()
//   })

//implement these routes
//POST /tour/[tour.id]/reviews - create a review for a tour with [tour.id]
//GET /tour/[tour.id]/reviews  -  get all reviews for a tour with [tour.id]
//GET /tour/[tour.id]/reviews/[review.id] -  a particular review on a tour with [tour.id]

// tour router should use the review router in case it ever encounters a route like the one below
// recall a router is middleware so we can use the use method
router.use('/:tourId/reviews', reviewRouter) // redirects to the reviewRouter in reviewRoutes

router
    .route('/top-5-cheap')
    .get(tourController.aliasTopTours, tourController.getAllTours);

router.route('/tour-stats').get(tourController.getTourStats);
router
    .route('/monthly-plan/:year')
    .get(
        authController.protect, 
        authController.restrictTo('admin', 'lead-guide', 'guide'),        
        tourController.getMonthlyPlan);

router               //the :distance you want- the center is your location = latlng, and the unit of distance =  (meter, miles etc)
    .route('/tours-within/:distance/center/:latlng/unit/:unit')
    .get(tourController.getToursWithin);
    //Example with query string:        /tours-within?distance=233&center=-40,45&unit=mi 
    //Example using the above format:   /tours-within/233/center/-40,45/unit/mi

    
router.route('/distances/:latlng/unit/:unit').get(tourController.getDistances);


//* general routes
router //we can chain the get and post. Compare with note below we would have to repeat the get and post routes
    .route('/')
    .get(tourController.getAllTours) // refactor: removed authController.protect so it can be available for everyone
    .post(authController.protect, authController.restrictTo('admin', 'lead-guide'), tourController.createTour)

router
    .route('/:id') //multiple params './:id/:x/:y' -- optional params './:id/:x/:y?'
    .get(tourController.getTour)
    .patch(
        authController.protect, 
        authController.restrictTo('admin', 'lead-guide'),        
        tourController.updateTour)
    .delete(
        authController.protect, 
        authController.restrictTo('admin', 'lead-guide'),
        tourController.deleteTour) //the above middleware have to succeed to get here

module.exports = router