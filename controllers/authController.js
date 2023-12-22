const User = require('../models/userModel')
const catchAsync = require('../utils/catchAsync')
const jwt = require('jsonwebtoken')
const AppError = require('../utils/appError')
/*
command line code to generate a secret key
node -e "console.log(require('crypto').randomBytes(64).toString('hex'));"
*/

exports.signup = catchAsync( async (req, res, next) => {
        const {name, email, password, passwordConfirm} = req.body
        // Create a new user
        const newUser = await User.create({ //using shortcut object notation where prop name = value name
            name,
            email,
            password,
            passwordConfirm,
        });

        //sign(payload: string | object | Buffer, secretOrPrivateKey: null, options?: (jwt.SignOptions & { algorithm: "none"; }) | undefined): string
        const token = jwt.sign(
            {id: newUser._id}, //payload
            process.env.JWT_SECRET, //secretOrPrivateKey
            {expiresIn: process.env.JWT_EXPIRE} //options
            )

        res.status(201).json({
            status: 'success',
            token: '',
            data: {
                user: newUser
            }
        });
});

exports.login = catchAsync( async (req, res, next) => {
    const {email, password} = req.body

    if (!email || !password) {
      return  next(new AppError('Please provide email and password!', 400))
    }

    const user = await User.findOne({email}).select('+password') // use + to select additional fields
    //const token = ''
    res.status(200).json({
        status: 'success',
        token: ''
    })
})
