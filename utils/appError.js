class AppError extends Error {
    constructor(message, statusCode) { //function that get called - see below
      super(message); // by calling the parent's super we set this.message to the incoming message

      this.statusCode = statusCode;
      //if status code starts with (String.startswith function) a '4' then return 'fail else 'error'
      this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
      this.isOperational = true;
      //call static method on the Error class to 
      Error.captureStackTrace(this, this.constructor);
    }
  }
  
  module.exports = AppError;

/*

So this.isOperational, and set it to true. So all of our errors will get this property set to true,
so that later, we can then test for this property and only send error messages back
to the client for these operational errors that we created using this class.

Error.captureStackTrace
we need to specify the current object, which is 'this', and 
then the AppError class itself, which is gonna be 'this.constructor'.

So this way when a new object is created, and a constructor function is called,
then that function call is not gonna appear in the stack trace, and will not pollute it.

  */