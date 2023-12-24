const express = require('express')
const router = express.Router()
const tourController = require('../controllers/tourController')
const authController = require('../controllers/authController')

//how to get access to the parameters of a request
// router.param('id', (req, res, next, value) => {
//     console.log(`Tour id is: ${value}`)
//     next()
//   })

router.route('/tour-stats').get(tourController.getTourStats);

router
    .route('/top-5-cheap')
    .get(tourController.aliasTopTours, tourController.getAllTours);

router.route('/monthly-plan/:year').get(tourController.getMonthlyPlan);

router //we can chain the get and post. Compare with note below we would have to repeat the get and post routes
    .route('/')
    .get(authController.protect, tourController.getAllTours) // refactor: this replaced app.get('api/v1/tours', getAllTours)
    .post(tourController.createTour)

router
    .route('/:id') //multiple params './:id/:x/:y' -- optional params './:id/:x/:y?'
    .get(tourController.getTour)
    .patch(tourController.updateTour)
    .delete(
        authController.protect, 
        authController.restrictTo('admin', 'lead-guide'),
        tourController.deleteTour) //the above middleware have to succeed to get here

module.exports = router