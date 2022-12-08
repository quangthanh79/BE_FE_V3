const express = require('express');
const router = express.Router();
const server = require('./../server');
const mongoose = require('mongoose');
const verify = require('../utils/verifyToken');
const Conversation = require('../models/Conversation');
const User = require('../models/User');
const convertString = require('../utils/convertString');
const {responseError, callRes} = require('../response/error');
const checkInput = require('../utils/validInput');
const validTime = require('../utils/validTime');


router.post("/token_notification", verify, async (req, res) => {
    console.log("CCCCCC");
    let token = req.query.token;
    let tokenFCM = req.query.tokenFCM;

    if (token === undefined){
        return callRes(res, responseError.PARAMETER_IS_NOT_ENOUGH, 'token');
    }
    if (typeof token != "string"){
        return callRes(res, responseError.PARAMETER_VALUE_IS_INVALID, 'token');
    }
    if (tokenFCM === undefined){
        return callRes(res, responseError.PARAMETER_IS_NOT_ENOUGH, 'tokenFCM');
    }
    if (typeof tokenFCM != "string"){
        return callRes(res, responseError.PARAMETER_VALUE_IS_INVALID, 'tokenFCM');
    }
    
    try {
        let user = await User.findById(req.user.id);
        user.tokenFCM = tokenFCM;
        await user.save();
        return callRes(res, responseError.OK);
    } catch (error) {
      return callRes(res, responseError.UNKNOWN_ERROR, error.message);
    }
  })
  module.exports = router;
