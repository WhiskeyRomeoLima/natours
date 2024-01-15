const express = require('express');
const path = require('path')
const morgan = require('morgan') //3rd party middleware for logging
const rateLimit = require('express-rate-limit') //for additional security best practic
const helmet = require('helmet') //for additional security best practice
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');
const AppError = require('./utils/appError');
const globalErrorHandler = require('./controllers/errorController');
const tourRouter = require('./routes/toursRoutes')
const userRouter = require('./routes/userRoutes')
const reviewRouter = require('./routes/reviewRoutes')

//* creating a server using express
// require express
// call express() and assign it to a variable
// or do it in one step: const app = require('express')()
// app now has the listen() function (see server.js)

//recall from nodeFarm we require(http) then used http.createServer((req, res) => {payload})
const app = express();

//* middlewares defined here run for all routes - global middleware comes before routes
//set security headers
app.use(helmet()) 

// development logging
if (process.env.NODE_ENV === 'development') {
    app.use(morgan('dev' )) //dev is a morgan format option
}
// Limit requests from same API
const limiter = rateLimit({
    max: 100,
    windowMs: 60 * 60 * 1000,
    message: 'Too many requests from this IP, please try again in an hour!'
  });
  app.use('/api', limiter); //apply this limiter to all routes that start with /api

// Body parser, reading data from body into req.body
app.use(express.json({ limit: '10kb' }));

// Data sanitization against NoSQL query injection
// without this, {"email": {"$gt": ""}} would work in user Login
app.use(mongoSanitize());

// Data sanitization against XSS (cross site scriptin)
app.use(xss());


// Prevent parameter pollution (hpp = HTTP Parameter Pollution)
app.use(
  hpp({ 
    whitelist: [
      'duration',
      'ratingsQuantity',
      'ratingsAverage',
      'maxGroupSize',
      'difficulty',
      'price'
    ]
  })
);

//Serving static files (notice public is not used in the url): in browser http://localhost:3000/img/logo-green-round.png
app.use(express.static(`${__dirname}/public`))

//Test middleware
app.use((req, res, next) => {
    req.requestTime = new Date().toISOString()
    next()
})

//*mounting routers
// we imported tourRouter which imports tourController to handle the routing (similar for userRouter)
app.use('/api/v1/tours', tourRouter)
app.use('/api/v1/users', userRouter)
app.use('/api/v1/reviews', reviewRouter)

//error handling for unrecognized url
app.all('*', (req, res, next) => {
    next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));    
  });

app.use(globalErrorHandler);

module.exports = app
//* -----------------------------------    

