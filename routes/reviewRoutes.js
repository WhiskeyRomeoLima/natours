const express = require('express');
const reviewController = require('../controllers/reviewController');
const authController = require('../controllers/authController');

const router = express.Router({mergeParams: true}); //see note at end of code
//mergeParams gives us access to the tourId from the route redirected from toursRoutes to here
//E.g. POST /tour/[tourId]/reviews
//E.g. Post /reviews

router.use(authController.protect)

router
  .route('/')
  .get(reviewController.getAllReviews)
  .post(
    authController.restrictTo('user'),
    reviewController.setTourUserIds,
    reviewController.createReview
  );

router
  .route('/:id')
  .get(reviewController.getReview)
  .patch(
    authController.restrictTo('user', 'admin'), 
    reviewController.updateReview)
  .delete(
    authController.restrictTo('user', 'admin'),
    reviewController.deleteReview)

module.exports = router //remember to mount router in app.js

/*

why is router.use('/:tourId/reviews',reviewRouter); calling createReview??
0 upvotes
Swopnil · Lecture 159 · 6 months ago
in reviewRoute.js

router.route('/')
    .get(revivewController.getAllReview)    
    .post(
        authController.protect,
        authController.restrictTo('user'),
        revivewController.createReview
    );
    
why does this code run for this route {{URL}}api/v1/tours/649dbe057dba8045406cd780/reviews

my dought is what if there were other route handlers in the reviewRoute.js would they be called too??

and if not why is the upper route('/') handller function of post being called??

1 reply

Prateek — Teaching Assistant
0 upvotes
6 months ago
Hi,

We are configuring different types of requests for the route that we are handling.

The router.route() function returns an instance of a single route that you can then use to handle HTTP verbs with optional middleware.

If you see the above code, we are handling different HTTP verbs like GET and POST.

In the POST route, we do have the middlewares which are optional. But you need to use them if you have created middlewares for a particular action which in this case is creating of the review. The first GET verb does not need any middleware so all it does is get all the reviews once the user visits that route in the web page.

For the POST verb, the user does need to pass both the middlewares. The user does need to have authorization to access protected routes and at the same time we restrict it to only the user that is currently logged in. Once this is ensured, the further responsibility of creating of the review is delegated to the createReview method of the reviewController. 

I hope that helps. Do let us know if you face any problem.

Thanks

*/