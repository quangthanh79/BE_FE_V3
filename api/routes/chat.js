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
const { Socket } = require('socket.io');



router.post('/add_dialog',verify, async (req, res) => {
    let token = req.query.token;
    let partnerId = req.query.partner_id;

    let content = req.query.message;
    if (token === undefined){
        return callRes(res, responseError.PARAMETER_IS_NOT_ENOUGH, 'token');
    }
    if (typeof token != "string"){
        return callRes(res, responseError.PARAMETER_VALUE_IS_INVALID, 'token');
    }
    if (content === undefined){
        return callRes(res, responseError.PARAMETER_IS_NOT_ENOUGH, 'content');
    }
    if (typeof content != "string"){
        return callRes(res, responseError.PARAMETER_VALUE_IS_INVALID, 'content');
    }
    if (content.length==0){
        return callRes(res, responseError.PARAMETER_VALUE_IS_INVALID, 'content not blank');
    }
    if (partnerId === undefined){
        return callRes(res, responseError.PARAMETER_IS_NOT_ENOUGH, 'partnerId');
    }
    if (typeof partnerId != "string"){
        return callRes(res, responseError.PARAMETER_VALUE_IS_INVALID, 'partnerId');
    }

    let id = req.user.id;
    let thisUser = await User.findById(id);
    if (thisUser.isBlocked){
        return callRes(res, responseError.USER_IS_NOT_VALIDATED, 'Your account has been blocked');
    }
    var targetConversation = undefined;
    try{
        var targetConversation1 = await Conversation.findOne({ firstUser: partnerId , secondUser: id});
        var targetConversation2 = await Conversation.findOne({ secondUser: partnerId , firstUser: id});
    }catch (err){
        return callRes(res, responseError.PARAMETER_VALUE_IS_INVALID, 'partner_id');
    }
    if (targetConversation1){
        targetConversation = targetConversation1
    } else if (targetConversation2){
        targetConversation = targetConversation2
    }
    else {
            // Not existed conversation
        let conversationId = await Conversation.find().count();
        targetConversation = new Conversation({
            conversationId,
            firstUser: id,
            secondUser: partnerId,
            });
    }
    targetConversation.dialog.push({
            dialogId: targetConversation.dialog.length,
            sender: id,
            created: String(Math.floor(Date.now())),
            content: content
    });
    try {
        let saved = await targetConversation.save();
      
        let data = {
                id: saved.id,
                firstUser: saved.firstUser,
                secondUser: saved.secondUser,
                message: content
        }
        const ioEmitter = req.app.get('socketIo');
        let user = await User.findById(id);
        let partner = await User.findById(partnerId);

        

        if(partner && user){
            var admin = require("firebase-admin");
            var serviceAccount = require("../../privateKey.json");
            if (admin.apps.length === 0) {
                admin.initializeApp({
                credential: admin.credential.cert(serviceAccount)
            });    
            }
            var tokenDevice = partner.tokenFCM;
            console.log("tokenDevice: "+ tokenDevice);
            const message = {
                notification: {
                    title: user.name,
                    body: content
                },
                token: tokenDevice
            };
            admin.messaging().send(message)
            .then(function(response){
                console.log("Successfully sent message: ",response)
            })
            .catch(function(error){
                console.log("Error sending message: ", error)
        })
        }

        if(user){
            ioEmitter.emit(partnerId,user.phoneNumber,content);
        }

            return callRes(res, responseError.OK, data);
    } 
    catch (error) {
            return callRes(res, responseError.CAN_NOT_CONNECT_TO_DB, error.message);
        }

});


// Not API
// router.post('/create_conversation',verify, async (req,res) => {
//     let token = req.query.token;
//     let partnerId = req.query.partner_id;
//     let contentFirst = req.query.messageFirst;

//     if (token === undefined){
//         return callRes(res, responseError.PARAMETER_IS_NOT_ENOUGH, 'token');
//     }
//     if (typeof token != "string"){
//         return callRes(res, responseError.PARAMETER_VALUE_IS_INVALID, 'token');
//     }
//     if (partnerId === undefined){
//         return callRes(res, responseError.PARAMETER_IS_NOT_ENOUGH, 'partnerId');
//     }
//     if (typeof partnerId != "string"){
//         return callRes(res, responseError.PARAMETER_VALUE_IS_INVALID, 'partnerId');
//     }

//     if (contentFirst === undefined){
//         return callRes(res, responseError.PARAMETER_IS_NOT_ENOUGH, 'content');
//     }
//     if (typeof contentFirst != "string"){
//         return callRes(res, responseError.PARAMETER_VALUE_IS_INVALID, 'content');
//     }

//     let id = req.user.id;
//     console.log("ID user: "+ id);
//     let thisUser = await User.findById(id);
//     if (thisUser.isBlocked){
//         return callRes(res, responseError.USER_IS_NOT_VALIDATED, 'Your account has been blocked');
//     }

//     try{
//         var partnerUser = await User.findById(partnerId);
//     } catch (err){
//         return callRes(res, responseError.PARAMETER_VALUE_IS_INVALID, 'Cannot find partner');
//     }
//     if (partnerUser == null){
//         return callRes(res, responseError.PARAMETER_VALUE_IS_INVALID, 'Cannot find partner');
//     }

//     try{
//         var targetConversation1 = await Conversation.findOne({ firstUser: partnerId , secondUser: id});
//         var targetConversation2 = await Conversation.findOne({ secondUser: partnerId , firstUser: id});
//     }catch (err){
//         return callRes(res, responseError.PARAMETER_VALUE_IS_INVALID, 'partner_id');
//     }
//     if (targetConversation1){
//         return callRes(res, responseError.PARAMETER_VALUE_IS_INVALID, 'Conversation existed');
//     }
//     if (targetConversation2){
//         return callRes(res, responseError.PARAMETER_VALUE_IS_INVALID, 'Conversation existed');
//     }
//     else {
//             // Not existed conversation
//         let conversationId = await Conversation.find().count();
//         const newConversation = new Conversation({
//             conversationId,
//             firstUser: id,
//             secondUser: partnerId,
//             });
//         newConversation.dialog.push({
//             dialogId: newConversation.dialog.length,
//             sender: id,
//             created: String(Math.floor(Date.now())),
//             content: contentFirst
//             });
//         try {

//             let saved = await newConversation.save();
      
//             let data = {
//                 id: saved.id,
//                 firstUser: saved.firstUser,
//                 secondUser: saved.secondUser,
//                 messageFirst: contentFirst
//             }
//             return callRes(res, responseError.OK, data);
//             } 
//         catch (error) {
//             return callRes(res, responseError.CAN_NOT_CONNECT_TO_DB, error.message);
//             }
//     }
    
// })

router.post('/get_conversation', verify, async (req, res) => {
    let token = req.query.token;
    if (token === undefined){
        return callRes(res, responseError.PARAMETER_IS_NOT_ENOUGH, 'token');
    }
    if (typeof token != "string"){
        return callRes(res, responseError.PARAMETER_VALUE_IS_INVALID, 'token');
    }
    let detail;
    let code, message;
    let id = req.user.id;
    let thisUser = await User.findById(id);
    if (thisUser.isBlocked){
        return callRes(res, responseError.USER_IS_NOT_VALIDATED, 'Your account has been blocked');
    }
    let data = []
    let indexMessageLast;
    if (req.query.indexLast === undefined){
        return callRes(res, responseError.PARAMETER_IS_NOT_ENOUGH, 'index');
    }
    if (req.query.partner_id){
        let targetConversation;
        let indexLast = req.query.indexLast;
        if (typeof indexLast != "string"){
            console.log("AAAAAAA1");
            return callRes(res, responseError.PARAMETER_VALUE_IS_INVALID, 'indexLast');
        }
        indexLast = parseInt(req.query.indexLast);
        if (indexLast < 0 && indexLast != -1){
            return callRes(res, responseError.PARAMETER_VALUE_IS_INVALID, 'indexLast');
        }
        let partnerId = req.query.partner_id;
        try{
            var targetConversation1 = await Conversation.findOne({ firstUser: partnerId, secondUser: id});
            var targetConversation2 = await Conversation.findOne({ firstUser: id ,secondUser: partnerId});
        }catch (err){
            return callRes(res, responseError.PARAMETER_VALUE_IS_INVALID, 'partner_id');
        }
        if( targetConversation1 == undefined && targetConversation2 == undefined){
            return callRes(res, responseError.CONVERSATION_IS_NOT_EXISTED, 'Cannot find conversation');
        }else{
            if(targetConversation1){
                targetConversation = targetConversation1;
            }else{
                targetConversation = targetConversation2;
            }
        }


        if(indexLast == -1){
            indexLast = targetConversation.dialog.length
        }
        
        console.log("INDEX LAST: "+ indexLast);
        let endFor = (indexLast - 29) <= 0 ? 0 : indexLast - 29;
        indexMessageLast = (endFor == 0 ? 0 : endFor);
        console.log("END FOR: "+ endFor);

        if(indexLast == 0){
            
        }else{
            let partnerUser = await User.findById(partnerId);
            for (let i = indexLast-1; i >= endFor; i--){
            // for (let i = endFor; i <= indexLast-1; i++){
                let targetUser;
                let x = targetConversation.dialog[i];
                let dialogInfo = {
                    message: null,
                    message_id: null,
                    unread: null,
                    created: null,
                    sender: {
                        id: null,
                        username: null,
                        avatar: null
                    }
                }
                if(x.sender == partnerId){
                    targetUser = partnerUser;
                }else{
                    targetUser = thisUser;
                }
                console.log(targetUser.name);
                console.log("-----------------");
                if (x.content === undefined || x.dialogId === undefined || x.created === undefined || x.content === '' || x.dialogId === '' || x.created === ''){
                    continue;
                }
                dialogInfo.message = x.content;
                dialogInfo.message_id = x.dialogId;
                dialogInfo.unread = x.unread;
                dialogInfo.created = x.created;
                dialogInfo.sender.id = targetUser._id;
                dialogInfo.sender.username = targetUser.name;
                dialogInfo.sender.avatar = targetUser.avatar.url;
                data.push(dialogInfo);
            }
        }

    }
    else 
    {
        return callRes(res, responseError.PARAMETER_IS_NOT_ENOUGH, 'conversation_id or partner_id');
    }
    code = "1000";
    message = "OK";
    data.reverse();
    res.json({ code, message,indexMessageLast, data });
});

router.post('/delete_conversation', verify, async (req, res) => {
    let token = req.query.token;
    if (token === undefined){
        return callRes(res, responseError.PARAMETER_IS_NOT_ENOUGH, 'token');
    }
    if (typeof token != "string"){
        return callRes(res, responseError.PARAMETER_VALUE_IS_INVALID, 'token');
    }
    let id = req.user.id;
    let thisUser = await User.findById(id);
    if (thisUser.isBlocked){
        return callRes(res, responseError.USER_IS_NOT_VALIDATED, 'Your account has been blocked');
    }
    if (req.query.partner_id){
        let targetConversation;
        let partnerId = req.query.partner_id;
        try{
            var partnerUser = await User.findById(partnerId);
        } catch (err){
            return callRes(res, responseError.PARAMETER_VALUE_IS_INVALID, 'Cannot find partner');
        }
        if (partnerUser == null){
            return callRes(res, responseError.PARAMETER_VALUE_IS_INVALID, 'Cannot find partner');
        }
        try{
            var targetConversation1 = await Conversation.findOne({ firstUser: partnerId });
            var targetConversation2 = await Conversation.findOne({ secondUser: partnerId });
        }catch (err){
            return callRes(res, responseError.PARAMETER_VALUE_IS_INVALID, 'partner_id');
        }
        if (targetConversation1){
            if (targetConversation1.secondUser == id){
                targetConversation = targetConversation1;
            }else {
                return callRes(res, responseError.PARAMETER_VALUE_IS_INVALID, 'Cannot find conversation');
            }
        }
        else if (targetConversation2){
            if (targetConversation2.firstUser == id){
                targetConversation = targetConversation2;
            }else {
                return callRes(res, responseError.PARAMETER_VALUE_IS_INVALID, 'Cannot find conversation');
            }
        }
        else {
            return callRes(res, responseError.PARAMETER_VALUE_IS_INVALID, 'Cannot find conversation');
        }
        await Conversation.deleteOne({ _id: targetConversation._id });
    }
    else if (req.query.conversation_id){
        let targetConversation;
        let conversationId = req.query.conversation_id;
        targetConversation = await Conversation.findOne({ conversationId: conversationId });
        if (targetConversation == null){
            return callRes(res, responseError.PARAMETER_VALUE_IS_INVALID, 'Cannot find conversation');
        }
        if (targetConversation.firstUser != id && targetConversation.secondUser != id){
            return callRes(res, responseError.PARAMETER_VALUE_IS_INVALID, 'This is not your conversation');
        }
        await Conversation.deleteOne({ _id: targetConversation._id });
    }
    else{
        return callRes(res, responseError.PARAMETER_IS_NOT_ENOUGH, 'conversation_id or partner_id');
    }
    return callRes(res, responseError.OK, 'Successfully delete conversation');
});

router.post('/delete_message', verify, async (req, res) => {
    let token = req.query.token;
    if (token === undefined){
        return callRes(res, responseError.PARAMETER_IS_NOT_ENOUGH, 'token');
    }
    if (typeof token != "string"){
        return callRes(res, responseError.PARAMETER_VALUE_IS_INVALID, 'token');
    }
    let id = req.user.id;
    let thisUser = await User.findById(id);
    if (thisUser.isBlocked){
        return callRes(res, responseError.USER_IS_NOT_VALIDATED, 'Your account has been blocked');
    }
    if (req.query.message_id === undefined){
        return callRes(res, responseError.PARAMETER_IS_NOT_ENOUGH, 'message_id');
    }
    if (req.query.partner_id){
        let flag = false;
        let targetConversation;
        let partnerId = req.query.partner_id;
        let messageId = req.query.message_id;
        try{
            var partnerUser = await User.findById(partnerId);
        } catch (err){
            return callRes(res, responseError.PARAMETER_VALUE_IS_INVALID, 'Cannot find partner');
        }
        if (partnerUser == null){
            return callRes(res, responseError.PARAMETER_VALUE_IS_INVALID, 'Cannot find partner');
        }
        try{
            var targetConversation1 = await Conversation.findOne({ firstUser: partnerId });
            var targetConversation2 = await Conversation.findOne({ secondUser: partnerId });
        }catch (err){
            return callRes(res, responseError.PARAMETER_VALUE_IS_INVALID, 'partner_id');
        }
        if (targetConversation1){
            if (targetConversation1.secondUser == id){
                targetConversation = targetConversation1;
            }else {
                return callRes(res, responseError.PARAMETER_VALUE_IS_INVALID, 'Cannot find conversation');
            }
        }
        else if (targetConversation2){
            if (targetConversation2.firstUser == id){
                targetConversation = targetConversation2;
            }else {
                return callRes(res, responseError.PARAMETER_VALUE_IS_INVALID, 'Cannot find conversation');
            }
        }
        else {
            return callRes(res, responseError.PARAMETER_VALUE_IS_INVALID, 'Cannot find conversation');
        }
        for (dialog in targetConversation.dialog){
            if (targetConversation.dialog[dialog].dialogId == messageId){
                if (targetConversation.dialog[dialog].sender == id){
                    targetConversation.dialog.splice(dialog, 1);
                    flag = true;
                    break;
                }
                else{
                    return callRes(res, responseError.PARAMETER_VALUE_IS_INVALID, 'This is not your message');
                }
            }
        }
        if (!flag){
            return callRes(res, responseError.PARAMETER_VALUE_IS_INVALID, 'Cannot find message');
        }
        targetConversation = await targetConversation.save();
    }
    else if (req.query.conversation_id){
        let flag = false;
        let targetConversation;
        let conversationId = req.query.conversation_id;
        let messageId = req.query.message_id;
        targetConversation = await Conversation.findOne({ conversationId: conversationId });
        if (targetConversation == null){
            return callRes(res, responseError.PARAMETER_VALUE_IS_INVALID, 'Cannot find conversation');
        }
        for (dialog in targetConversation.dialog){
            if (targetConversation.dialog[dialog].dialogId == messageId){
                if (targetConversation.dialog[dialog].sender == id){
                    targetConversation.dialog.splice(dialog, 1);
                    flag = true;
                    break;
                }
                else{
                    return callRes(res, responseError.PARAMETER_VALUE_IS_INVALID, 'This is not your message');
                }
            }
        }
        if (!flag){
            return callRes(res, responseError.PARAMETER_VALUE_IS_INVALID, 'Cannot find message');
        }
        targetConversation = await targetConversation.save();
    }
    else{
        return callRes(res, responseError.PARAMETER_IS_NOT_ENOUGH, 'conversation_id or partner_id');
    }
    return callRes(res, responseError.OK, 'Successfully delete message');
});

router.post('/set_read_message', verify, async (req, res) => {
    let token = req.query.token;
    if (token === undefined){
        return callRes(res, responseError.PARAMETER_IS_NOT_ENOUGH, 'token');
    }
    if (typeof token != "string"){
        return callRes(res, responseError.PARAMETER_VALUE_IS_INVALID, 'token');
    }
    let id = req.user.id;
    let thisUser = await User.findById(id);
    if (thisUser.isBlocked){
        return callRes(res, responseError.USER_IS_NOT_VALIDATED, 'Your account has been blocked');
    }
    console.log("PARTNER ID: "+req.query.partner_id);
    if (req.query.partner_id){
        let targetConversation;
        let partnerId = req.query.partner_id;
        try{
            var partnerUser = await User.findById(partnerId);
        } catch (err){
            return callRes(res, responseError.PARAMETER_VALUE_IS_INVALID, 'Cannot find partner');
        }
        if (partnerUser == null){
            return callRes(res, responseError.PARAMETER_VALUE_IS_INVALID, 'Cannot find partner');
        }
        try{
            var targetConversation1 = await Conversation.findOne({ firstUser: partnerId , secondUser: id});
            var targetConversation2 = await Conversation.findOne({ secondUser: partnerId , firstUser: id});
        }catch (err){
            return callRes(res, responseError.PARAMETER_VALUE_IS_INVALID, 'partner_id');
        }
        if (targetConversation1){
            console.log("1");
            console.log("ID SECOND: "+targetConversation1.secondUser);
            targetConversation = targetConversation1;
        }
        else if (targetConversation2){
            console.log("2");
            targetConversation = targetConversation2;
        }
        
        if(targetConversation){
            for (dialog in targetConversation.dialog){
                targetConversation.dialog[dialog].unread = "0"  ;
            }
            targetConversation = await targetConversation.save();
        }else{
            return callRes(res, responseError.PARAMETER_VALUE_IS_INVALID, '4 Cannot find conversation');
        }
    }
    // else if (req.query.conversation_id){
    //     let targetConversation;
    //     let conversationId = req.query.conversation_id;
    //     targetConversation = await Conversation.findOne({ conversationId: conversationId });
    //     if (targetConversation == null){
    //         return callRes(res, responseError.PARAMETER_VALUE_IS_INVALID, 'Cannot find conversation');
    //     }
    //     if (targetConversation.firstUser != id && targetConversation.secondUser != id){
    //         return callRes(res, responseError.PARAMETER_VALUE_IS_INVALID, 'This is not your conversation');
    //     }
    //     for (dialog in targetConversation.dialog){
    //         targetConversation.dialog[dialog].unread = "0";
    //         await targetConversation.save();
    //     }
    //     targetConversation = await targetConversation.save();
    // }
    else{
        return callRes(res, responseError.PARAMETER_IS_NOT_ENOUGH, 'conversation_id or partner_id');
    }
    return callRes(res, responseError.OK, 'Successfully set read message');
});

router.post('/get_list_conversation', verify, async (req, res) => {
    let token = req.query.token;
    console.log(token);
    if (token === undefined){
        return callRes(res, responseError.PARAMETER_IS_NOT_ENOUGH, 'token');
    }
    if (typeof token != "string"){
        return callRes(res, responseError.PARAMETER_VALUE_IS_INVALID, 'token');
    }
    let code, message;
    let id = req.user.id;
    console.log("ID: "+ id);
    let thisUser = await User.findById(id);
    if (thisUser.isBlocked){
        return callRes(res, responseError.USER_IS_NOT_VALIDATED, 'Your account has been blocked');
    }
    let page = req.query.page;
    if (page === undefined){
        return callRes(res, responseError.PARAMETER_IS_NOT_ENOUGH, 'page');
    }
    if (typeof page != "string"){
        return callRes(res, responseError.PARAMETER_VALUE_IS_INVALID, 'page');
    }
    let isNumCount = /^\d+$/.test(page);
    if (!isNumCount){
        return callRes(res, responseError.PARAMETER_VALUE_IS_INVALID, 'page');
    }
    page = parseInt(req.query.page);
    console.log("PAGE: "+ page);

    if (page < 0 || page === 0){
        return callRes(res, responseError.PARAMETER_VALUE_IS_INVALID, 'page');
    }
    // if (page == 0){
    //     console.log("NO_DATA_OR_END_OF_LIST_DATA");
    //     return callRes(res, responseError.NO_DATA_OR_END_OF_LIST_DATA);
    // }
    var numNewMessage = 0;
    let data = [];
    // if (req.query.index === undefined || req.query.count === undefined){
    //     return callRes(res, responseError.PARAMETER_IS_NOT_ENOUGH, 'index and count');
    // }
    var conversations = [];
    let conversationFirst = await Conversation.find({ firstUser: id });
    let conversationSecond = await Conversation.find({ secondUser: id });
    for (conversation in conversationFirst){
        conversations.push(conversationFirst[conversation]);
    }
    for (conversation in conversationSecond){
        conversations.push(conversationSecond[conversation]);
    }
    let endFor = conversations.length < 20*page ? conversations.length : 20*page;
    let startFor = 20*(page-1);
    for (let i = startFor; i < endFor; i++){
        let x = conversations[i];
        // if (x.conversationId == null || x.conversationId == ""){
        //     continue;
        // }
        console.log("endFor2 = "+ endFor);

        let conversationInfo = {
            id: null,
            partner: {
                id: null,
                username: null,
                avatar: null
            },
            lastMessage: {
                created: null,
                message: null,
                senderId: null,
                unread: null
            }
        }
        let partner, lastDialog;
        if (x.firstUser == id){
            partner = await User.findById(x.secondUser);
            console.log("AAApartner = "+ partner);

        }
        else{
            partner = await User.findById(x.firstUser);
            console.log("BBBpartner = "+ partner);
        }
        lastDialog = x.dialog[x.dialog.length - 1];
        conversationInfo.id = x.conversationId;
        conversationInfo.partner.id = partner._id;
        conversationInfo.partner.username = (partner.name) ? partner.name : null;

        console.log("username = "+ partner.name);

        conversationInfo.partner.avatar = (partner.avatar.url) ? partner.avatar.url : null;
        conversationInfo.lastMessage.message = lastDialog.content;
        conversationInfo.lastMessage.created = lastDialog.created;
        conversationInfo.lastMessage.senderId = lastDialog.sender;
        if (lastDialog.unread === undefined || lastDialog.unread == null || lastDialog.unread == "1"){
            conversationInfo.lastMessage.unread = "1";
        }
        else{
            conversationInfo.lastMessage.unread = "0";
        }
        for (dialog in x.dialog){
            if (x.dialog[dialog].unread == "1"){
                numNewMessage += 1;
                break;
            }
        }
        data.push(conversationInfo);
    }
    // if (data.length == 0){
    //     console.log("DATA LENGTH =0");
    //     return callRes(res, responseError.NO_DATA_OR_END_OF_LIST_DATA);
    // }
    code = "1000";
    message = "OK";
    res.json({ code, message, data, numNewMessage });
});

// 


module.exports = router;
