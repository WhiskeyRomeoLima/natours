/*

//* the below original version does not work because it calls fn
//* rather than return it so that express could call it when an error occurs
//* see comments below
const catchAsync = fn => {
    fn(req, res, next).catch(err => next(err)) //this code allows us to get rid of the catch blocks in the handlers
}

exports.createTour = catchAsync(async (req, res, next) => {
  const newTour = await Tour.create(req.body);

  res.status(201).json({
    status: 'success',
    data: {
      tour: newTour
    }
  });
});

So createTour variable should really be a function
not the result of calling a function.
But that's right now what's happening.
So right now catchAsync is being called,
which then calls the fn function.
But this function should not called,
instead it should sit here and wait until express calls it.

And express will of course call it as soon as someone hits the route
that needs this control function.
And so the solution to that is to basically make
the catchAsync function return another function
which is then gonna be assigned to createTour
and so that function can then later be called when necessary.

//* So let's do that here.
//* note the chained catch which is passed a function to execute
const catchAsync = fn => {
    return (req, res, next) => {
        fn(req, res, next).catch(err => next(err))
    }      
}

//* no change
exports.createTour = catchAsync(async (req, res, next) => {
  const newTour = await Tour.create(req.body);

  res.status(201).json({
    status: 'success',
    data: {
      tour: newTour
    }
  });
});

So let's return an anonymous function and
remember that this is the function
that express is then going to call.

So we simply wrapped our asynchronous function
inside of the catchAsync function that we just created.

This function will then return a new anonymous function,
which is the outside function in catchAsync: 

//*
    return (req, res, next) => {
        fn(req, res, next).catch(err => next(err))
    }

which will then be assigned to createTour.

This function will be called as soon as 
a new tour is created using the createTour handler.

Since the function passed into catchAsync is asynchronous, 
it will return a promise and therefore, 
in case there is an error that is it gets rejected,
we can then catch the error that happened.

And in the end, it is this catch method of inner function that 
will pass the error into the next function
and will then make it so that our error
ends up in our global error handling middleware.

*/