const express = require('express');
const morgan = require('morgan') //3rd party middleware for logging

const AppError = require('./utils/appError');
const globalErrorHandler = require('./controllers/errorController');
const tourRouter = require('./routes/toursRoutes')
const userRouter = require('./routes/userRoutes')

//* creating a server using express
// require express
// call express() and assign it to a variable
// or do it in one step: const app = require('express')()
// app now has the listen() function (see server.js)

//recall from nodeFarm we require(http) then used http.createServer((req, res) => {payload})
const app = express();

//In Setting up Express and Basic Routing lesson (6: 50)
// app.get('/', (req, res) => {
//     res.status(200).json({message: 'Hello from the server!', app: 'Natours'})
//   })
//* middlewares defined here run for all routes - global middleware comes before routes
if (process.env.NODE_ENV === 'development') {
    app.use(morgan('dev' )) //dev is a morgan format option
}

// how we get access to middleware.  Eg. middleware (body parser) is added to middleware stack - used to get access to the request body
app.use(express.json()) //call json function and adds middleware to the middleware stack

//*how to serve a static file (notice public is not used in the url): in browser http://localhost:3000/img/logo-green-round.png
//app.use(express.static(`${__dirname}/public`))

// app.use((req, res, next) => {
//     console.log(req) //the url used
//     console.log('Hello from middleware')
//     next()
// })

app.use((req, res, next) => {
    req.requestTime = new Date().toISOString()
    console.log(req.headers)
    next()
})

//*mounting routers
// we imported tourRouter which imports tourController to handle the routing (similar for userRouter)
app.use('/api/v1/tours', tourRouter)
app.use('/api/v1/users', userRouter)

//error handling for unrecognized url
app.all('*', (req, res, next) => {
    next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));    
  });

app.use(globalErrorHandler);

module.exports = app
//* -----------------------------------    

