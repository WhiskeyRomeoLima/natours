const express = require('express')
const userController = require('../controllers/userController')
const authController = require('../controllers/authController')
const router = express.Router()

//* routes are middleware and middleware runs in sequence of definition

//the following four routes do not require being logged in
router.post('/signup', authController.signup)
router.post('/login', authController.login)
router.post('/forgotPassword', authController.forgotPassword)
router.patch('/resetPassword/:token', authController.resetPassword)

router.use(authController.protect) //protects all of the folling routes

//the following routes require authentication
router.patch(
    '/updateMyPassword',  
    authController.updatePassword)

router.get(
    '/me', 
    userController.getMe, 
    userController.getUser )

router.patch(
    '/updateMe',  
    userController.updateMe)

router.delete(
    '/deleteMe', 
    userController.deleteMe)

router.use(authController.restrictTo('admin'));
//the following routes are restricted to admin
router
    .route('/')
    .get(userController.getAllUsers)
    .post(userController.createUser)

router
    .route('/:id')
    .get(userController.getUser)
    .patch(userController.updateUser)
    .delete(userController.deleteUser)

module.exports = router