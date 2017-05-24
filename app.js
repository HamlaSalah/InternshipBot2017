'use strict'

const express = require('express')
const bodyParser = require('body-parser')
const request = require('request')
const app = express()
const _ = require('underscore')

var mongoose = require('mongoose');
mongoose.connect('mongodb://heroku_95p28tqf:mbpvb06h1su1gghfn4bq8tj6j4@ds149711.mlab.com:49711/heroku_95p28tqf');
var db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function() {
  // we're connected!
});
var answer = mongoose.Schema({
    index : Number, // index of question
    answer : String
});
var conversationSchema = mongoose.Schema({
    userId: String,
    answers : [answer]
});
var Conversation = mongoose.model('Conversation', conversationSchema);

app.set('port', (process.env.PORT || 5000))
app.use(bodyParser.urlencoded({extended: false}))
app.use(bodyParser.json())

// Index route
app.get('/', function (req, res) {
	res.send('Hello world, I am a chat bot')
})

// for Facebook verification
app.get('/webhook/', function (req, res) {
	if (req.query['hub.verify_token'] === 'Stage2017') {
		res.send(req.query['hub.challenge'])
	}
	res.send('Error, wrong token')
})
// questions
var requests = [ "What is your company name please ?",
              "Product name ?",
              "Category ? (mobile game or mobile app)",
              "What kind of audience are you targeting ? ( gender, location, age range)",
              "Budget ?"];
// keep tab of different conversations before persisting them
var rooms = [];

app.post('/webhook/', function (req, res) {
    let messaging_events = req.body.entry[0].messaging
    for (let i = 0; i < messaging_events.length; i++) {
	    let event = req.body.entry[0].messaging[i]
	    let sender = event.sender.id;

      // user has sent a message from fb
      if (event.message && event.message.text) {
        var room  =   _.find(rooms, function (o) { return o.userId === sender; })
        if(!room) {
          var conv = new Conversation();
          conv.userId = sender;
          rooms.push(conv);
          sendTextMessage(sender, "Welcome, i'm your Miami Bot here to serve you. Please answer a few questions "+requests[0]);

        } else // if conversation is allready started
        {
          // answer question
          if(room.answers.length < requests.length-1) {
            sendTextMessage(sender, "MiamiBot : " + requests[room.answers.length+1]);
          }


          // end of questions , persist form
          if(room.answers.length === requests.length-1) {
              var conv  =  _.find(rooms, function (o) { return o.userId === sender; })
              rooms = _.without(rooms, _.find(room)); // free index in array

              // save to mongodb
              conv.save(function (err, conv) {
                if (err) {
                  return console.error(err);
                } else {
                  sendTextMessage(sender, "Thanks for answering we will send you an email");

                  // res.sendStatus(200);
                }
              });
              console.log("fin des questions");
            }


            room.answers.push({ index : room.answers.length+1, answer : event.message.text});
          }
        }
	    }
      res.sendStatus(200);
})

const token = "EAAaki7fqWnQBAIpImRWBdhhMZANvzBFpM0gAZAseNJqNMJcYUr77ZAWZBskr4ZC2Ta9vzzoHOMJj53FlbfsIEIxx00gC93owzlXa5N2ptevqnXGw056hBZCNnYKlI8SOZCMzP862nSv4Fja5ZCNMmDQ103C7TAvMyZAdAH691FpyJxwZDZD";

function sendTextMessage(sender, text) {
    let messageData = { text:text }
    request({
	    url: 'https://graph.facebook.com/v2.6/me/messages',
	    qs: {access_token:token},
	    method: 'POST',
		json: {
		    recipient: {id:sender},
			message: messageData,
		}
	}, function(error, response, body) {
		if (error) {
		    console.log('Error sending messages: ', error)
		} else if (response.body.error) {
		    console.log('Error: ', response.body.error)
	    }
    })
}

// Spin up the server
app.listen(app.get('port'), function() {
	console.log('running on port', app.get('port'))
})
