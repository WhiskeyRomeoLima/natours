const express = require('express')
const userController = require('../controllers/userController')
const authController = require('../controllers/authController')
const router = express.Router()
//https://github.com/jonasschmedtmann/complete-node-bootcamp/blob/master/4-natours/after-section-10/routes/userRoutes.js

router.post('/signup', authController.signup)
router.post('/login', authController.login)

router.post('/forgotPassword', authController.forgotPassword)
router.patch('/resetPassword/:token', authController.resetPassword)


router.patch('/updateMyPassword', authController.protect, authController.updatePassword)
router.patch('/updateMe', authController.protect, userController.updateMe)
router.delete('/deleteMe', authController.protect, userController.deleteMe)

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