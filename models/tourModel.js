const mongoose = require('mongoose')
const slugify = require('slugify')
const validator = require('validator')
// const User = require('./userModel'); This was used with the how to embedding of guides 

const tourSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'A tour must have a name'],
      unique: true,
      trim: true,
      maxlength: [40, 'A tour name must have less or equal than 40 characters'],
      minlength: [10, 'A tour name must have more or equal than 10 characters'],
      //the below is not useful because it fails when spaces are included and names need to contain spaces
      //validate: [validator.isAlpha, 'Tour name must only contain characters']
    },
    slug: String,
    duration: {
      type: Number,
      required: [true, 'A tour must have a duration']
    },
    maxGroupSize: {
      type: Number,
      required: [true, 'A tour must have a group size']
    },
    difficulty: {
      type: String,
      required: [true, 'A tour must have a difficulty'],
      enum: {
        values: ['easy', 'medium', 'difficult'],
        message: 'Difficulty is either: easy, medium, difficult'
      }
    },
    ratingsAverage: {
      type: Number,
      default: 4.5,
      min: [1, 'Rating must be above 1.0'],
      max: [5, 'Rating must be below 5.0'],
      set: val => Math.round(val * 10) / 10 // 4.666666, 46.6666, 47, 4.7
    },
    ratingsQuantity: {
      type: Number,
      default: 0
    },
    price: {
      type: Number,
      required: [true, 'A tour must have a price']
    },
    priceDiscount: {
      type: Number,
      validate: {
        validator: function(val) {
          // this only points to current doc on NEW document creation - not document updates
          return val < this.price;
        },
        message: 'Discount price ({VALUE}) should be below regular price'
      }
    },
    summary: {
      type: String,
      trim: true,
      required: [true, 'A tour must have a description']
    },
    description: {
      type: String,
      trim: true
    },
    imageCover: {
      type: String,
      required: [true, 'A tour must have a cover image']
    },
    images: [String],
    createdAt: {
      type: Date,
      default: Date.now(),
      select: false
    },
    startDates: [Date],
    secretTour: {
      type: Boolean,
      default: false
    },
    startLocation: {
      // GeoJSON the following is GeoJSON object with required type and coordinates properties
      type: {
        type: String,
        default: 'Point',
        enum: ['Point']
      },
      coordinates: [Number],
      address: String,
      description: String
    },
    locations: [ // to  create new documents and then embed them into another document, we need to create an array
      {
        type: {
          type: String,
          default: 'Point',
          enum: ['Point']
        },
        coordinates: [Number], //expect an array of number
        address: String,
        description: String,
        day: Number
      }
    ],
    guides: [
      {
        type: mongoose.Schema.ObjectId,
        ref: 'User'
      }
    ]
  },
  /* how use reference (see model entry below)
And so just like before, all we pass into the guides is an array of the IDs.
But this time we actually specified an object ID .

So in the database we see this:
guides Array (2)
0:  ObjectId('6589da8b3fd8a532f5521896')
1:  ObjectId('6595829b7a5ec496247bc8ba')

But behind the scenes, it's also a reference to the user.
So, when we now create a tour here, it will actually only contain these IDs,
and not the user corresponding to the IDs.
  */
  {
    toJSON: { virtuals: true }, // anytime data is expressed as a JSON object or regular object make it visible in the output
    toObject: { virtuals: true }
  }
);
  
tourSchema.virtual('durationWeeks').get(function() {
  return this.duration / 7 //note arrow functions do not get their own this, so we use a regular function declaration
})

//* DOCUMENT MIDDLEWARE: 
// runs before create and save - not updates
tourSchema.pre('save', function(next) {
  this.slug = slugify(this.name, { lower: true });
  next();
});

//*How to embed: this embeds users (guide) documents inside the tour model
// tourSchema.pre('save', async function(next) {
//   const guidesPromises = this.guides.map(async id => await User.findById(id)); //result is an array of promises
//   this.guides = await Promise.all(guidesPromises); //returns an array of user documents who are guides
//   next();
// });

// tourSchema.pre('save', function(next) {
//   console.log('Will save document...');
//   console.log(this)
  
//   next();
// });

//after the save
// tourSchema.post('save', function(doc, next) {
//   console.log(doc);
//   next();
// });

// QUERY MIDDLEWARE
tourSchema.pre(/^find/, function(next) { //using regular expression to run for any query that begins with 'find' eg findOne, findOneAndUpdate, etc
  this.find({ secretTour: { $ne: true } });
  this.start = Date.now();
  next();
});

tourSchema.pre(/^find/, function(next) {
  this.populate({ //use populate to fill model properties that use reference
  path: 'guides',
  select: '-__v -passwordChangedAt'
})
  next()
})


tourSchema.post(/^find/, function(docs, next) {
  console.log(`Query took ${Date.now() - this.start} milliseconds!`);
  next();
});

// AGGREGATION MIDDLEWARE
tourSchema.pre('aggregate', function(next) { //this points to the current aggregation
  this.pipeline().unshift({ $match: { secretTour: { $ne: true } } });
  //pipeline is an array so use unshift to add items to beginning
  console.log(this.pipeline());
  next();
});

  const Tour = mongoose.model('Tour', tourSchema)

  module.exports = Tour;
  
